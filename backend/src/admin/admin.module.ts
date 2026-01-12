import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { ProxiesModule } from '../proxies/proxies.module';
import { HealthModule } from '../health/health.module';
import { AuthModule } from '../auth/auth.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { Socks5UpstreamModule } from '../socks5-upstream/socks5-upstream.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { PaymentsModule } from '../payments/payments.module';
import { PortMappingsModule } from '../port-mappings/port-mappings.module';
import { UserProxyPurchase } from '../purchases/user-proxy-purchase.entity';
import { PaymentOrder } from '../payments/payment-order.entity';
import { PortMapping } from '../port-mappings/port-mappings.entity';
import { Gateway } from '../gateways/gateways.entity';
import { GatewayPort } from '../gateway-ports/gateway-ports.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserProxyPurchase,
      PaymentOrder,
      PortMapping,
      Gateway,
      GatewayPort,
    ]),
    UsersModule,
    ProxiesModule,
    HealthModule,
    AuthModule,
    GatewaysModule,
    Socks5UpstreamModule,
    PurchasesModule,
    PaymentsModule,
    PortMappingsModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}

