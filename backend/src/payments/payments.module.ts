import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SePayService } from './sepay.service';
import { PaymentOrder } from './payment-order.entity';
import { PurchasesModule } from '../purchases/purchases.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrder]),
    forwardRef(() => PurchasesModule),
    AuthModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, SePayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
