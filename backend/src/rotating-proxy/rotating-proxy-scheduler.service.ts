import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RotatingProxyService } from './rotating-proxy.service';

@Injectable()
export class RotatingProxySchedulerService {
  private readonly logger = new Logger(RotatingProxySchedulerService.name);

  constructor(private rotatingProxyService: RotatingProxyService) {}

  /**
   * Chạy mỗi 5 phút để kiểm tra và expire rotating proxy purchases hết hạn
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredRotatingProxyPurchases() {
    this.logger.log('Checking for expired rotating proxy purchases...');
    try {
      await this.rotatingProxyService.expireExpiredPurchases();
    } catch (error: any) {
      this.logger.error(
        `Error checking expired rotating proxy purchases: ${error.message}`,
        error.stack,
      );
    }
  }
}
