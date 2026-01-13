import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { User } from './users/users.entity';
import { Token } from './tokens/tokens.entity';
import { Socks5Proxy } from './proxies/proxies.entity';
import { Socks5Upstream } from './socks5-upstream/socks5-upstream.entity';
import { Gateway } from './gateways/gateways.entity';
import { GatewayPort } from './gateway-ports/gateway-ports.entity';
import { PortMapping } from './port-mappings/port-mappings.entity';
import { UserProxyPurchase } from './purchases/user-proxy-purchase.entity';
import { PortChangeHistory } from './port-change-history/port-change-history.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProxiesModule } from './proxies/proxies.module';
import { UsageModule } from './usage/usage.module';
import { AdminModule } from './admin/admin.module';
import { PurchasesModule } from './purchases/purchases.module';
import { PortMappingsModule } from './port-mappings/port-mappings.module';
import { PortChangeHistoryModule } from './port-change-history/port-change-history.module';
import { PaymentsModule } from './payments/payments.module';
import { PaymentOrder } from './payments/payment-order.entity';
import { EmailOtp } from './otp/otp.entity';
import { AppVersion } from './app-version/app-version.entity';
import { AppVersionModule } from './app-version/app-version.module';
import { RotatingProxyPurchase } from './rotating-proxy/rotating-proxy-purchase.entity';
import { RotatingProxyModule } from './rotating-proxy/rotating-proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'proxyadmin',
      password: process.env.DATABASE_PASSWORD || 'changeme',
      database: process.env.DATABASE_NAME || 'Proxy96',
      entities: [
        User,
        Token,
        Socks5Proxy,
        Socks5Upstream,
        Gateway,
        GatewayPort,
        PortMapping,
        UserProxyPurchase,
        PortChangeHistory,
        PaymentOrder,
        EmailOtp,
        AppVersion,
        RotatingProxyPurchase,
      ],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
    }),
    UsersModule,
    AuthModule,
    ProxiesModule,
    UsageModule,
    AdminModule,
    PurchasesModule,
    PortMappingsModule,
    PortChangeHistoryModule,
    PaymentsModule,
    AppVersionModule,
    RotatingProxyModule,
  ],
})
export class AppModule {}

