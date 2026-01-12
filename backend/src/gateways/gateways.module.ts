import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gateway } from './gateways.entity';
import { GatewaysService } from './gateways.service';
import { GatewaysController } from './gateways.controller';
import { GatewayPortsModule } from '../gateway-ports/gateway-ports.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Gateway]),
    forwardRef(() => GatewayPortsModule),
  ],
  controllers: [GatewaysController],
  providers: [GatewaysService],
  exports: [GatewaysService],
})
export class GatewaysModule {}

