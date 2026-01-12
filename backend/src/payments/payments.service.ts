import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PaymentOrder, PaymentOrderStatus, PurchaseType } from './payment-order.entity';
import { SePayService } from './sepay.service';
import { PurchasesService, CreateUpstreamPurchaseDto } from '../purchases/purchases.service';
import { PurchaseDuration } from '../purchases/user-proxy-purchase.entity';
import * as crypto from 'crypto';

export interface CreateUpstreamOrderDto {
  upstreamIds: string[];
  gatewayId?: string;
  duration: PurchaseDuration;
}

export interface PaymentOrderResponse {
  id: string;
  orderCode: string;
  amount: number;
  status: PaymentOrderStatus;
  qrCodeUrl: string | null;
  vaNumber: string | null;
  accountName: string | null;
  expiredAt: Date;
  createdAt: Date;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentOrder)
    private paymentOrderRepository: Repository<PaymentOrder>,
    private sepayService: SePayService,
    @Inject(forwardRef(() => PurchasesService))
    private purchasesService: PurchasesService,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async createUpstreamOrder(
    userId: string,
    createDto: CreateUpstreamOrderDto,
  ): Promise<PaymentOrderResponse> {
    // Validate input
    if (!createDto.upstreamIds || createDto.upstreamIds.length === 0) {
      throw new BadRequestException('At least one upstream ID is required');
    }

    // Calculate price (sử dụng logic từ PurchasesService)
    const price = this.calculatePrice(createDto.upstreamIds.length, createDto.duration);

    // Generate unique order code
    const orderCode = this.generateOrderCode();

    // Calculate expiration time (15 minutes from now)
    const expiredAt = new Date(Date.now() + 15 * 60 * 1000);

    // Create payment order in database
    const paymentOrder = this.paymentOrderRepository.create({
      orderCode,
      userId,
      amount: price,
      status: PaymentOrderStatus.PENDING,
      purchaseType: PurchaseType.UPSTREAM,
      purchaseData: {
        upstreamIds: createDto.upstreamIds,
        gatewayId: createDto.gatewayId,
        duration: createDto.duration,
      },
      expiredAt,
    });

    const savedOrder = await this.paymentOrderRepository.save(paymentOrder);

    // Tạo QR code URL từ SePay
    const description = `Thanh toan ${createDto.upstreamIds.length} proxy - ${orderCode}`;
    const qrCodeUrl = this.sepayService.generateQRCodeUrl(price, description);
    
    // Cập nhật QR code URL và số tài khoản vào order
    if (qrCodeUrl) {
      savedOrder.qrCodeUrl = qrCodeUrl;
      // Lấy số tài khoản từ config
      const bankAccount = this.configService.get<string>('SEPAY_BANK_ACCOUNT') || '';
      if (bankAccount) {
        savedOrder.vaNumber = bankAccount;
      }
      await this.paymentOrderRepository.save(savedOrder);
    }

    // Lấy tên tài khoản từ config (nếu có)
    const accountName = this.configService.get<string>('SEPAY_ACCOUNT_NAME') || null;

    return {
      id: savedOrder.id,
      orderCode: savedOrder.orderCode,
      amount: Number(savedOrder.amount),
      status: savedOrder.status,
      qrCodeUrl: savedOrder.qrCodeUrl,
      vaNumber: savedOrder.vaNumber,
      accountName: accountName,
      expiredAt: savedOrder.expiredAt,
      createdAt: savedOrder.createdAt,
    };
  }

  async getOrderByCode(orderCode: string): Promise<PaymentOrder | null> {
    return this.paymentOrderRepository.findOne({
      where: { orderCode },
    });
  }

  async getOrderByCodeForUser(
    orderCode: string,
    userId: string,
  ): Promise<PaymentOrderResponse | null> {
    const order = await this.paymentOrderRepository.findOne({
      where: { orderCode, userId },
    });

    if (!order) {
      return null;
    }

    return {
      id: order.id,
      orderCode: order.orderCode,
      amount: Number(order.amount),
      status: order.status,
      qrCodeUrl: order.qrCodeUrl,
      vaNumber: order.vaNumber,
      accountName: null,
      expiredAt: order.expiredAt,
      createdAt: order.createdAt,
    };
  }

  async handleSePayWebhook(webhookPayload: any): Promise<void> {
    try {
      // Extract order code from webhook
      const orderCode = this.sepayService.extractOrderCodeFromWebhook(webhookPayload);

      if (!orderCode) {
        this.logger.warn('Webhook missing orderCode');
        return;
      }

      // Find payment order
      const paymentOrder = await this.paymentOrderRepository.findOne({
        where: { orderCode },
      });

      if (!paymentOrder) {
        this.logger.warn(`Payment order not found: ${orderCode}`);
        return;
      }

      // Kiểm tra xem webhook có cung cấp thông tin QR code và account không
      // (webhook có thể gửi thông tin này khi order được tạo)
      const hasPaymentInfo = webhookPayload.qrCodeUrl || webhookPayload.qrCode || 
                            webhookPayload.accountNumber || webhookPayload.virtualAccountNumber;
      const isPaid = webhookPayload.status === 'paid' || webhookPayload.status === 'success' ||
                     webhookPayload.paid === true || webhookPayload.transactionId;

      // Cập nhật thông tin QR code và account nếu có
      if (hasPaymentInfo && paymentOrder.status === PaymentOrderStatus.PENDING) {
        paymentOrder.qrCodeUrl = webhookPayload.qrCodeUrl || webhookPayload.qrCode || paymentOrder.qrCodeUrl;
        paymentOrder.vaNumber = webhookPayload.accountNumber || 
                                webhookPayload.virtualAccountNumber || 
                                paymentOrder.vaNumber;
        paymentOrder.sepayOrderId = webhookPayload.id || 
                                   webhookPayload.paymentLinkId || 
                                   paymentOrder.sepayOrderId;
        
        // Cập nhật expiredAt nếu có
        if (webhookPayload.expiredAt) {
          const webhookExpiredAt = new Date(webhookPayload.expiredAt);
          if (webhookExpiredAt.getTime() < paymentOrder.expiredAt.getTime()) {
            paymentOrder.expiredAt = webhookExpiredAt;
          }
        }
        
        await this.paymentOrderRepository.save(paymentOrder);
        this.logger.log(`Updated payment info for order: ${orderCode}`);
      }

      // Nếu webhook thông báo thanh toán thành công
      if (isPaid) {
        // Check if already processed (idempotent)
        if (paymentOrder.status === PaymentOrderStatus.PAID) {
          this.logger.warn(`Order already paid: ${orderCode}`);
          // Vẫn thử activate purchase nếu chưa có (để đảm bảo idempotent)
          await this.tryActivatePurchaseFromOrder(paymentOrder);
          return;
        }

        // Check if expired
        if (new Date() > paymentOrder.expiredAt) {
          this.logger.warn(`Order expired: ${orderCode}`);
          paymentOrder.status = PaymentOrderStatus.EXPIRED;
          await this.paymentOrderRepository.save(paymentOrder);
          return;
        }

        // Verify amount (có thể cấu hình để chấp nhận sai lệch nhỏ)
        const webhookAmount = Number(webhookPayload.amount);
        const orderAmount = Number(paymentOrder.amount);
        
        // Cho phép sai lệch 1000 VND
        if (webhookAmount && Math.abs(webhookAmount - orderAmount) > 1000) {
          this.logger.warn(
            `Amount mismatch for order ${orderCode}: expected ${orderAmount}, got ${webhookAmount}`,
          );
          // Có thể cấu hình để từ chối hoặc chấp nhận
          // throw new BadRequestException('Amount mismatch');
        }

        // Update payment order
        paymentOrder.status = PaymentOrderStatus.PAID;
        paymentOrder.paidAt = new Date();
        paymentOrder.sepayTransactionId = webhookPayload.id || 
                                         webhookPayload.transactionId || 
                                         paymentOrder.sepayTransactionId;

        await this.paymentOrderRepository.save(paymentOrder);

        // Activate purchase
        await this.activatePurchaseFromOrder(paymentOrder);

        this.logger.log(`Payment order activated: ${orderCode}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to handle webhook: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async activatePurchaseFromOrder(
    paymentOrder: PaymentOrder,
  ): Promise<void> {
    if (paymentOrder.purchaseType !== PurchaseType.UPSTREAM) {
      this.logger.warn(`Unsupported purchase type: ${paymentOrder.purchaseType}`);
      return;
    }

    const purchaseData = paymentOrder.purchaseData as CreateUpstreamPurchaseDto;

    // Call purchases service to create purchase
    // PurchasesService sẽ tạo purchase và port mappings trong transaction riêng
    try {
      await this.purchasesService.createUpstreamPurchase(
        paymentOrder.userId,
        {
          upstreamIds: purchaseData.upstreamIds,
          gatewayId: purchaseData.gatewayId,
          duration: purchaseData.duration,
        },
      );
      this.logger.log(`Purchase activated for order: ${paymentOrder.orderCode}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to activate purchase for order ${paymentOrder.orderCode}: ${error.message}`,
        error.stack,
      );
      // Không throw error để webhook handler trả về success
      // Purchase có thể được retry sau
      throw error;
    }
  }

  private async tryActivatePurchaseFromOrder(
    paymentOrder: PaymentOrder,
  ): Promise<void> {
    // Method này được gọi khi order đã paid nhưng có thể purchase chưa được tạo
    // Thử activate lại để đảm bảo tính idempotent
    try {
      await this.activatePurchaseFromOrder(paymentOrder);
    } catch (error: any) {
      // Nếu purchase đã được tạo rồi (upstream already rented), đó là expected
      // Log nhưng không throw error
      this.logger.debug(
        `Purchase may already exist for order ${paymentOrder.orderCode}: ${error.message}`,
      );
    }
  }

  private generateOrderCode(): string {
    // Format: PAY-{timestamp}-{random}
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `PAY-${timestamp}-${random}`;
  }

  private calculatePrice(upstreamCount: number, duration: PurchaseDuration): number {
    // Price per upstream per duration (VNĐ)
    const durationPrices: Record<PurchaseDuration, number> = {
      [PurchaseDuration.HOURS_24]: 10000,  // 1 ngày: 10,000 VNĐ
      [PurchaseDuration.DAYS_7]: 65000,    // 7 ngày: 65,000 VNĐ
      [PurchaseDuration.DAYS_30]: 250000,  // 30 ngày: 250,000 VNĐ
    };

    const pricePerUpstream = durationPrices[duration] || 10000;
    return Number((upstreamCount * pricePerUpstream).toFixed(0));
  }

  // Method để check và expire các order hết hạn
  async expireOldOrders(): Promise<void> {
    const expiredOrders = await this.paymentOrderRepository.find({
      where: {
        status: PaymentOrderStatus.PENDING,
      },
    });

    const now = new Date();
    for (const order of expiredOrders) {
      if (order.expiredAt < now) {
        order.status = PaymentOrderStatus.EXPIRED;
        await this.paymentOrderRepository.save(order);
      }
    }
  }
}
