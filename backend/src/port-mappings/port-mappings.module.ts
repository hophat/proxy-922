import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortMapping } from './port-mappings.entity';
import { PortMappingsService } from './port-mappings.service';
import { PortMappingsController } from './port-mappings.controller';
import { Socks5UpstreamModule } from '../socks5-upstream/socks5-upstream.module';

@Module({
  imports: [TypeOrmModule.forFeature([PortMapping]), Socks5UpstreamModule],
  controllers: [PortMappingsController],
  providers: [PortMappingsService],
  exports: [PortMappingsService],
})
export class PortMappingsModule {}
