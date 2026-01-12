import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PurchasesService } from './purchases.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class PurchasesSchedulerService {
  private readonly logger = new Logger(PurchasesSchedulerService.name);

  constructor(
    private purchasesService: PurchasesService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
  ) {}

  /**
   * Chạy mỗi 5 phút để kiểm tra và expire purchases hết hạn
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredPurchases() {
    this.logger.log('Checking for expired purchases...');
    try {
      await this.purchasesService.expireExpiredPurchases();
    } catch (error: any) {
      this.logger.error(
        `Error checking expired purchases: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Chạy mỗi 5 phút để kiểm tra và expire payment orders hết hạn
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredPaymentOrders() {
    this.logger.log('Checking for expired payment orders...');
    try {
      await this.paymentsService.expireOldOrders();
    } catch (error: any) {
      this.logger.error(
        `Error checking expired payment orders: ${error.message}`,
        error.stack,
      );
    }
  }
}
