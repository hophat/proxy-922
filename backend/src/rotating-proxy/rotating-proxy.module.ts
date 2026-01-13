import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RotatingProxyService } from './rotating-proxy.service';
import { RotatingProxyController } from './rotating-proxy.controller';
import { RotatingProxyPurchase } from './rotating-proxy-purchase.entity';
import { PaymentOrder } from '../payments/payment-order.entity';
import { PaymentsModule } from '../payments/payments.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RotatingProxyPurchase, PaymentOrder]),
    forwardRef(() => PaymentsModule),
    AuthModule,
  ],
  controllers: [RotatingProxyController],
  providers: [RotatingProxyService],
  exports: [RotatingProxyService],
})
export class RotatingProxyModule {}
