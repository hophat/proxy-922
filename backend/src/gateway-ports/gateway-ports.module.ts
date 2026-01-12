import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GatewayPort } from './gateway-ports.entity';
import { GatewayPortsService } from './gateway-ports.service';
import { GatewayPortsController } from './gateway-ports.controller';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GatewayPort]),
    forwardRef(() => GatewaysModule),
  ],
  controllers: [GatewayPortsController],
  providers: [GatewayPortsService],
  exports: [GatewayPortsService],
})
export class GatewayPortsModule {}

