import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface SePayOrderRequest {
  amount: number;
  description: string;
  orderCode: string;
  returnUrl?: string;
  cancelUrl?: string;
}

interface SePayOrderResponse {
  orderCode: string;
  qrCode?: string;
  qrCodeUrl?: string;
  checkoutUrl?: string;
  accountNumber?: string;
  accountName?: string;
  bin?: string;
  amount: number;
  description: string;
  currency: string;
  paymentLinkId?: string;
  expiredAt?: string;
}

interface SePayWebhookPayload {
  id?: string;
  orderCode: string;
  amount: number;
  description?: string;
  accountNumber?: string;
  reference?: string;
  transactionDateTime?: string;
  currency?: string;
  paymentLinkId?: string;
  code?: string;
  desc?: string;
  counterAccountBankId?: string;
  counterAccountBankName?: string;
  counterAccountName?: string;
  counterAccountNumber?: string;
  virtualAccountName?: string;
  virtualAccountNumber?: string;
  [key: string]: any;
}

@Injectable()
export class SePayService {
  private readonly logger = new Logger(SePayService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string | null;
  private readonly bankAccount: string;
  private readonly bankName: string;

  constructor(private configService: ConfigService) {
    this.apiUrl =
      this.configService.get<string>('SEPAY_API_URL') ||
      'https://api.sepay.vn';
    this.apiKey = this.configService.get<string>('SEPAY_API_KEY') || '';
    this.webhookSecret =
      this.configService.get<string>('SEPAY_WEBHOOK_SECRET') || null;
    this.bankAccount = this.configService.get<string>('SEPAY_BANK_ACCOUNT') || '';
    this.bankName = this.configService.get<string>('SEPAY_BANK_NAME') || 'Vietcombank';

    if (!this.apiKey) {
      this.logger.warn('SEPAY_API_KEY is not set');
    }
    if (!this.bankAccount) {
      this.logger.warn('SEPAY_BANK_ACCOUNT is not set');
    }
  }

  /**
   * Tạo QR code URL từ SePay theo tài liệu: https://docs.sepay.vn/tao-qr-code-vietqr-dong.html
   * Format: https://qr.sepay.vn/img?acc=SO_TAI_KHOAN&bank=NGAN_HANG&amount=SO_TIEN&des=NOI_DUNG
   */
  generateQRCodeUrl(
    amount: number,
    description: string,
  ): string | null {
    if (!this.bankAccount || !this.bankName) {
      this.logger.warn('Bank account or bank name not configured for QR code generation');
      return null;
    }

    // Encode description để URL safe
    const encodedDescription = encodeURIComponent(description);
    
    // Tạo QR code URL
    const qrCodeUrl = `https://qr.sepay.vn/img?acc=${this.bankAccount}&bank=${this.bankName}&amount=${amount}&des=${encodedDescription}`;
    
    return qrCodeUrl;
  }

  async createOrder(request: SePayOrderRequest): Promise<SePayOrderResponse> {
    try {
      const url = `${this.apiUrl}/v2/payments`;
      
      const payload = {
        amount: request.amount,
        description: request.description,
        orderCode: request.orderCode,
        returnUrl: request.returnUrl,
        cancelUrl: request.cancelUrl,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `SePay API error: ${response.status} - ${errorText}`,
        );
        throw new BadRequestException(
          `Failed to create SePay order: ${errorText}`,
        );
      }

      const data = await response.json();
      
      // SePay API có thể trả về format khác nhau, cần xử lý linh hoạt
      return {
        orderCode: data.orderCode || request.orderCode,
        qrCode: data.qrCode || data.qr_code,
        qrCodeUrl: data.qrCodeUrl || data.qr_code_url || data.checkoutUrl,
        checkoutUrl: data.checkoutUrl,
        accountNumber: data.accountNumber || data.account_number || data.virtualAccountNumber || data.virtual_account_number,
        accountName: data.accountName || data.account_name || data.virtualAccountName || data.virtual_account_name,
        bin: data.bin,
        amount: data.amount || request.amount,
        description: data.description || request.description,
        currency: data.currency || 'VND',
        paymentLinkId: data.paymentLinkId || data.payment_link_id,
        expiredAt: data.expiredAt || data.expired_at,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create SePay order: ${error.message}`, error.stack);
      throw error;
    }
  }

  verifyWebhook(
    payload: SePayWebhookPayload,
    signature: string | null,
  ): boolean {
    // Nếu có webhook secret, xác thực signature
    if (this.webhookSecret && signature) {
      try {
        const expectedSignature = crypto
          .createHmac('sha256', this.webhookSecret)
          .update(JSON.stringify(payload))
          .digest('hex');

        return crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature),
        );
      } catch (error) {
        this.logger.error('Error verifying webhook signature', error);
        return false;
      }
    }

    // Nếu không có secret, chỉ kiểm tra cơ bản
    return !!payload.orderCode && !!payload.amount;
  }

  extractOrderCodeFromWebhook(payload: SePayWebhookPayload): string {
    // SePay có thể gửi orderCode trong các field khác nhau
    return (
      payload.orderCode ||
      payload.code ||
      payload.order_code ||
      payload.reference ||
      ''
    );
  }
}
