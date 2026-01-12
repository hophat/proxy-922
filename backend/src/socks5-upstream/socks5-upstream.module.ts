import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Socks5Upstream } from './socks5-upstream.entity';
import { PortMapping } from '../port-mappings/port-mappings.entity';
import { Socks5UpstreamService } from './socks5-upstream.service';
import { Socks5UpstreamController } from './socks5-upstream.controller';
import { GeoLocationModule } from '../geo-location/geo-location.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Socks5Upstream, PortMapping]),
    GeoLocationModule,
  ],
  controllers: [Socks5UpstreamController],
  providers: [Socks5UpstreamService],
  exports: [Socks5UpstreamService],
})
export class Socks5UpstreamModule {}

