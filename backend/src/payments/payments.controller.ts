import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { PaymentsService, CreateUpstreamOrderDto } from './payments.service';
import { SePayService } from './sepay.service';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private paymentsService: PaymentsService,
    private sepayService: SePayService,
    private authService: AuthService,
  ) {}

  @Post('orders/upstream')
  @UseGuards(JwtAuthGuard)
  async createUpstreamOrder(
    @Body() createDto: CreateUpstreamOrderDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    return this.paymentsService.createUpstreamOrder(
      validation.userId,
      createDto,
    );
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getOrders(
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    return this.paymentsService.getOrdersForUser(validation.userId);
  }

  @Get('orders/:orderCode')
  @UseGuards(JwtAuthGuard)
  async getOrder(
    @Param('orderCode') orderCode: string,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    const order = await this.paymentsService.getOrderByCodeForUser(
      orderCode,
      validation.userId,
    );

    if (!order) {
      return null;
    }

    return order;
  }

  @Post('webhooks/sepay')
  @HttpCode(HttpStatus.OK)
  async handleSePayWebhook(
    @Body() webhookPayload: any,
    @Headers('authorization') authorization: string | undefined,
    @Req() req: any,
  ) {
    // Public endpoint - không cần JWT auth
    // Xác thực bằng API key từ header Authorization: "Apikey API_KEY"

    try {
      // Verify API key từ header Authorization
      // Format: "Authorization: Apikey API_KEY_CUA_BAN"
      const isValidApiKey = this.sepayService.verifyApiKey(authorization);

      if (!isValidApiKey) {
        this.logger.warn('Invalid API key in webhook request');
        // Trả về success để SePay không retry, nhưng log warning
        return { success: false, message: 'Invalid API key' };
      }

      // Verify webhook payload (kiểm tra có order code và amount)
      const isValidPayload = this.sepayService.verifyWebhook(
        webhookPayload,
        null, // Không dùng signature nữa, dùng API key
      );

      if (!isValidPayload) {
        this.logger.warn('Invalid webhook payload');
        return { success: false, message: 'Invalid payload' };
      }

      // Handle webhook
      await this.paymentsService.handleSePayWebhook(webhookPayload);

      return { success: true };
    } catch (error: any) {
      this.logger.error(
        `Error handling SePay webhook: ${error.message}`,
        error.stack,
      );
      this.logger.error(`Webhook payload: ${JSON.stringify(webhookPayload)}`);
      
      // Trả về success để SePay không retry
      // Nhưng include error message để debug
      return { 
        success: true, 
        message: 'Processed with errors',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }
}
