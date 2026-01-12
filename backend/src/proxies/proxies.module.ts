import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Socks5Proxy } from './proxies.entity';
import { ProxiesService } from './proxies.service';
import { ProxiesController } from './proxies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Socks5Proxy])],
  controllers: [ProxiesController],
  providers: [ProxiesService],
  exports: [ProxiesService],
})
export class ProxiesModule {}

