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
  // Format mới từ SePay BankAPI
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  subAccount?: string | null;
  code?: string;
  content?: string;
  transferType?: string; // "in" = payment vào
  description?: string; // Chứa order code: "BankAPINotify PAY9710298467"
  transferAmount?: number;
  referenceCode?: string;
  accumulated?: number;
  id?: number;
  
  // Các field cũ (backward compatibility)
  orderCode?: string;
  amount?: number;
  account_number?: string;
  reference?: string;
  transactionDateTime?: string;
  currency?: string;
  paymentLinkId?: string;
  desc?: string;
  counterAccountBankId?: string;
  counterAccountBankName?: string;
  counterAccountName?: string;
  counterAccountNumber?: string;
  virtualAccountName?: string;
  virtualAccountNumber?: string;
  status?: string;
  paid?: boolean;
  transactionId?: string;
  qrCodeUrl?: string;
  qrCode?: string;
  expiredAt?: string;
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
    // Format mới: cần có description (chứa order code) và transferAmount
    // Format cũ: cần có orderCode và amount
    const hasOrderCode = !!this.extractOrderCodeFromWebhook(payload);
    const hasAmount = !!(payload.transferAmount || payload.amount);
    return hasOrderCode && hasAmount;
  }

  extractOrderCodeFromWebhook(payload: SePayWebhookPayload): string {
    // Format mới: order code nằm trong description field
    // Ví dụ: "BankAPINotify PAY9710298467"
    if (payload.description) {
      // Tìm pattern PAY{10 số} trong description
      const match = payload.description.match(/PAY\d{10}/);
      if (match) {
        return match[0];
      }
    }
    
    // Format cũ: SePay có thể gửi orderCode trong các field khác nhau
    return (
      payload.orderCode ||
      payload.code ||
      payload.order_code ||
      payload.reference ||
      payload.referenceCode ||
      ''
    );
  }

  /**
   * Xác thực API key từ header Authorization
   * Format: "Authorization: Apikey API_KEY_CUA_BAN"
   * So sánh với SEPAY_WEBHOOK_SECRET
   */
  verifyApiKey(authorizationHeader: string | undefined): boolean {
    if (!authorizationHeader) {
      return false;
    }

    // Extract API key từ format "Apikey {key}"
    const match = authorizationHeader.match(/^Apikey\s+(.+)$/i);
    if (!match) {
      return false;
    }

    const providedApiKey = match[1].trim();
    
    // So sánh với SEPAY_WEBHOOK_SECRET được cấu hình
    if (!this.webhookSecret) {
      this.logger.warn('SEPAY_WEBHOOK_SECRET is not configured');
      return false;
    }

    // Kiểm tra độ dài trước để tránh lỗi "Input buffers must have the same byte length"
    if (providedApiKey.length !== this.webhookSecret.length) {
      return false;
    }

    // So sánh an toàn để tránh timing attack
    // crypto.timingSafeEqual yêu cầu hai buffer phải có cùng độ dài
    try {
      return crypto.timingSafeEqual(
        Buffer.from(providedApiKey),
        Buffer.from(this.webhookSecret),
      );
    } catch (error) {
      this.logger.error(`Error comparing API keys: ${error.message}`);
      return false;
    }
  }
}
