import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortMapping } from './port-mappings.entity';
import { PortMappingsService } from './port-mappings.service';
import { PortMappingsController } from './port-mappings.controller';
import { Socks5UpstreamModule } from '../socks5-upstream/socks5-upstream.module';
import { GatewayPortsModule } from '../gateway-ports/gateway-ports.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PortMapping]),
    Socks5UpstreamModule,
    GatewayPortsModule,
    PurchasesModule,
    AuthModule,
  ],
  controllers: [PortMappingsController],
  providers: [PortMappingsService],
  exports: [PortMappingsService],
})
export class PortMappingsModule {}
