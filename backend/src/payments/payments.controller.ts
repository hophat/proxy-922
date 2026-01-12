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
    // Nhưng có thể xác thực bằng API key trong header nếu cần

    try {
      // Verify webhook signature nếu có
      const signature = authorization?.replace('Bearer ', '') || req.headers['x-sepay-signature'];
      const isValid = this.sepayService.verifyWebhook(
        webhookPayload,
        signature || null,
      );

      if (!isValid && this.sepayService['webhookSecret']) {
        this.logger.warn('Invalid webhook signature');
        // Trả về success để SePay không retry
        return { success: false, message: 'Invalid signature' };
      }

      // Handle webhook
      await this.paymentsService.handleSePayWebhook(webhookPayload);

      return { success: true };
    } catch (error: any) {
      this.logger.error(
        `Error handling SePay webhook: ${error.message}`,
        error.stack,
      );
      
      // Trả về success để SePay không retry
      // Nếu cần retry, có thể return error status
      return { success: true, message: 'Processed with errors' };
    }
  }
}
