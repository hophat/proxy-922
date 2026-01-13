import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { PurchasesSchedulerService } from './purchases-scheduler.service';
import { UserProxyPurchase } from './user-proxy-purchase.entity';
import { GatewayPort } from '../gateway-ports/gateway-ports.entity';
import { PortMapping } from '../port-mappings/port-mappings.entity';
import { Socks5Upstream } from '../socks5-upstream/socks5-upstream.entity';
import { GatewaysModule } from '../gateways/gateways.module';
import { GatewayPortsModule } from '../gateway-ports/gateway-ports.module';
import { Socks5UpstreamModule } from '../socks5-upstream/socks5-upstream.module';
import { PortChangeHistoryModule } from '../port-change-history/port-change-history.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserProxyPurchase,
      GatewayPort,
      PortMapping,
      Socks5Upstream,
    ]),
    GatewaysModule,
    GatewayPortsModule,
    Socks5UpstreamModule,
    PortChangeHistoryModule,
    AuthModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService, PurchasesSchedulerService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
