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
import { RotatingProxyService, CreateRotatingProxyPurchaseDto } from '../rotating-proxy/rotating-proxy.service';
import * as crypto from 'crypto';

export interface CreateUpstreamOrderDto {
  upstreamIds: string[];
  gatewayId?: string;
  duration: PurchaseDuration;
  selectedPorts?: number[]; // Optional: Array of port numbers (3000-10000) mà user chọn
}

export interface CreateRotatingProxyOrderDto {
  proxyCount: number;
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
    @Inject(forwardRef(() => RotatingProxyService))
    private rotatingProxyService: RotatingProxyService,
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
        selectedPorts: createDto.selectedPorts,
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

  async getOrdersForUser(userId: string): Promise<PaymentOrderResponse[]> {
    const orders = await this.paymentOrderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => ({
      id: order.id,
      orderCode: order.orderCode,
      amount: Number(order.amount),
      status: order.status,
      qrCodeUrl: order.qrCodeUrl,
      vaNumber: order.vaNumber,
      accountName: null,
      expiredAt: order.expiredAt,
      createdAt: order.createdAt,
    }));
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
      this.logger.log(`Received webhook: ${JSON.stringify(webhookPayload)}`);
      
      // Extract order code from webhook
      const orderCode = this.sepayService.extractOrderCodeFromWebhook(webhookPayload);

      if (!orderCode) {
        this.logger.warn('Webhook missing orderCode');
        this.logger.warn(`Webhook payload: ${JSON.stringify(webhookPayload)}`);
        throw new BadRequestException('Webhook missing orderCode');
      }

      this.logger.log(`Extracted order code: ${orderCode}`);

      // Find payment order
      const paymentOrder = await this.paymentOrderRepository.findOne({
        where: { orderCode },
      });

      if (!paymentOrder) {
        this.logger.warn(`Payment order not found: ${orderCode}`);
        throw new NotFoundException(`Payment order not found: ${orderCode}`);
      }

      this.logger.log(`Found payment order: ${paymentOrder.id}, status: ${paymentOrder.status}`);

      // Kiểm tra xem webhook có cung cấp thông tin QR code và account không
      // (webhook có thể gửi thông tin này khi order được tạo)
      const hasPaymentInfo = webhookPayload.qrCodeUrl || webhookPayload.qrCode || 
                            webhookPayload.accountNumber || webhookPayload.virtualAccountNumber;
      
      // Format mới: transferType === 'in' nghĩa là có payment vào
      // Format cũ: status === 'paid' hoặc 'success'
      const isPaid = webhookPayload.transferType === 'in' ||
                     webhookPayload.status === 'paid' || 
                     webhookPayload.status === 'success' ||
                     webhookPayload.paid === true || 
                     webhookPayload.transactionId;

      // Cập nhật thông tin QR code và account nếu có
      if (hasPaymentInfo && paymentOrder.status === PaymentOrderStatus.PENDING) {
        paymentOrder.qrCodeUrl = webhookPayload.qrCodeUrl || webhookPayload.qrCode || paymentOrder.qrCodeUrl;
        // Format mới: sử dụng accountNumber
        // Format cũ: sử dụng virtualAccountNumber
        paymentOrder.vaNumber = webhookPayload.accountNumber || 
                                webhookPayload.virtualAccountNumber || 
                                paymentOrder.vaNumber;
        // Format mới: id là number, cần convert sang string
        // Format cũ: id là string hoặc paymentLinkId
        paymentOrder.sepayOrderId = webhookPayload.id?.toString() || 
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
        // Format mới: sử dụng transferAmount
        // Format cũ: sử dụng amount
        const webhookAmount = Number(webhookPayload.transferAmount || webhookPayload.amount);
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
        
        // Format mới: sử dụng transactionDate
        // Format cũ: sử dụng Date.now()
        if (webhookPayload.transactionDate) {
          // Parse date format: "2025-12-24 10:16:36"
          const transactionDate = new Date(webhookPayload.transactionDate.replace(' ', 'T'));
          paymentOrder.paidAt = isNaN(transactionDate.getTime()) ? new Date() : transactionDate;
        } else {
          paymentOrder.paidAt = new Date();
        }
        
        // Format mới: sử dụng id (number)
        // Format cũ: sử dụng id (string) hoặc transactionId
        paymentOrder.sepayTransactionId = webhookPayload.id?.toString() || 
                                         webhookPayload.transactionId || 
                                         webhookPayload.referenceCode ||
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
      this.logger.error(`Webhook payload that caused error: ${JSON.stringify(webhookPayload)}`);
      
      // Re-throw để controller có thể xử lý
      throw error;
    }
  }

  private async activatePurchaseFromOrder(
    paymentOrder: PaymentOrder,
  ): Promise<void> {
    if (paymentOrder.purchaseType === PurchaseType.UPSTREAM) {
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
            selectedPorts: purchaseData.selectedPorts,
          },
        );
        this.logger.log(`Purchase activated for order: ${paymentOrder.orderCode}`);
      } catch (error: any) {
        // Check if error is due to duplicate/constraint violation
        const isDuplicateError = 
          error.message?.includes('duplicate key') ||
          error.message?.includes('unique constraint') ||
          error.message?.includes('already rented') ||
          error.code === '23505'; // PostgreSQL unique violation error code
        
        if (isDuplicateError) {
          // Purchase đã được tạo rồi (có thể do webhook được gọi lại)
          this.logger.log(
            `Purchase already exists for order ${paymentOrder.orderCode}: ${error.message}`,
          );
          return; // Không throw error, coi như đã xử lý thành công
        }
        
        this.logger.error(
          `Failed to activate purchase for order ${paymentOrder.orderCode}: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    } else if (paymentOrder.purchaseType === PurchaseType.ROTATING_PROXY) {
      const purchaseData = paymentOrder.purchaseData as CreateRotatingProxyPurchaseDto;

      if (!purchaseData) {
        this.logger.error(
          `Purchase data is missing for rotating proxy order: ${paymentOrder.orderCode}`,
        );
        throw new BadRequestException('Purchase data is missing');
      }

      this.logger.log(
        `Activating rotating proxy purchase for order: ${paymentOrder.orderCode}, proxyCount: ${purchaseData.proxyCount}, duration: ${purchaseData.duration}`,
      );

      // Call rotating proxy service to create purchase
      try {
        const result = await this.rotatingProxyService.createRotatingProxyPurchase(
          paymentOrder.userId,
          paymentOrder.id,
          {
            proxyCount: purchaseData.proxyCount,
            duration: purchaseData.duration,
          },
        );
        this.logger.log(
          `Rotating proxy purchase activated for order: ${paymentOrder.orderCode}, created ${result.length} proxies`,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to activate rotating proxy purchase for order ${paymentOrder.orderCode}: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    } else {
      this.logger.warn(`Unsupported purchase type: ${paymentOrder.purchaseType}`);
      return;
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
      // Check if error is due to duplicate/constraint violation (purchase already exists)
      const isDuplicateError = 
        error.message?.includes('duplicate key') ||
        error.message?.includes('unique constraint') ||
        error.message?.includes('already rented') ||
        error.code === '23505'; // PostgreSQL unique violation error code
      
      if (isDuplicateError) {
        // Purchase đã được tạo rồi, đó là expected khi webhook được gọi lại
        this.logger.log(
          `Purchase already exists for order ${paymentOrder.orderCode}: ${error.message}`,
        );
        return; // Không throw error, coi như đã xử lý thành công
      }
      
      // For rotating proxy, always throw error to surface issues (trừ duplicate)
      if (paymentOrder.purchaseType === PurchaseType.ROTATING_PROXY) {
        this.logger.error(
          `Failed to activate rotating proxy purchase for order ${paymentOrder.orderCode}: ${error.message}`,
          error.stack,
        );
        throw error;
      }
      
      // For upstream, log nhưng không throw error cho các lỗi khác
      this.logger.warn(
        `Purchase activation issue for order ${paymentOrder.orderCode}: ${error.message}`,
      );
    }
  }

  // Public method để activate purchase từ payment order (dùng cho admin manual update)
  async activatePurchaseFromPaymentOrderId(paymentOrderId: string): Promise<void> {
    const paymentOrder = await this.paymentOrderRepository.findOne({
      where: { id: paymentOrderId },
    });

    if (!paymentOrder) {
      throw new NotFoundException(`Payment order not found: ${paymentOrderId}`);
    }

    if (paymentOrder.status !== PaymentOrderStatus.PAID) {
      throw new BadRequestException(
        `Payment order ${paymentOrder.orderCode} is not in PAID status`,
      );
    }

    // Sử dụng tryActivatePurchaseFromOrder để handle idempotent
    await this.tryActivatePurchaseFromOrder(paymentOrder);
  }

  private generateOrderCode(): string {
    // Format: PAY{10 số}
    // Tạo số ngẫu nhiên 10 chữ số
    const randomNumber = crypto.randomInt(1000000000, 9999999999);
    return `PAY${randomNumber}`;
  }

  private calculatePrice(upstreamCount: number, duration: PurchaseDuration): number {
    // Price per upstream per duration (VNĐ)
    const durationPrices: Record<PurchaseDuration, number> = {
      [PurchaseDuration.HOURS_24]: 10000,  // 1 ngày: 10,000 VNĐ
      [PurchaseDuration.DAYS_1]: 4000,     // 1 ngày: 4,000 VNĐ (rotating proxy)
      [PurchaseDuration.DAYS_3]: 12000,    // 3 ngày: 12,000 VNĐ (rotating proxy)
      [PurchaseDuration.DAYS_7]: 65000,    // 7 ngày: 65,000 VNĐ (upstream) hoặc 28,000 VNĐ (rotating proxy)
      [PurchaseDuration.DAYS_15]: 60000,   // 15 ngày: 60,000 VNĐ (rotating proxy)
      [PurchaseDuration.DAYS_30]: 250000,  // 30 ngày: 250,000 VNĐ (upstream)
    };

    const pricePerUpstream = durationPrices[duration] || 10000;
    return Number((upstreamCount * pricePerUpstream).toFixed(0));
  }

  async createRotatingProxyOrder(
    userId: string,
    createDto: CreateRotatingProxyOrderDto,
  ): Promise<PaymentOrderResponse> {
    // Validate input
    if (!createDto.proxyCount || createDto.proxyCount < 1 || createDto.proxyCount > 100) {
      throw new BadRequestException('Proxy count must be between 1 and 100');
    }

    // Calculate price using RotatingProxyService
    const price = this.rotatingProxyService.calculatePrice(
      createDto.proxyCount,
      createDto.duration,
    );

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
      purchaseType: PurchaseType.ROTATING_PROXY,
      purchaseData: {
        proxyCount: createDto.proxyCount,
        duration: createDto.duration,
      },
      expiredAt,
    });

    const savedOrder = await this.paymentOrderRepository.save(paymentOrder);

    // Tạo QR code URL từ SePay
    const description = `Thanh toan ${createDto.proxyCount} rotating proxy - ${orderCode}`;
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
