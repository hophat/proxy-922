import { Module } from '@nestjs/common';
import { HealthService } from './health.service';
import { ProxiesModule } from '../proxies/proxies.module';

@Module({
  imports: [ProxiesModule],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}

