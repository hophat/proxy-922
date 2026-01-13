import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortChangeHistory } from './port-change-history.entity';
import { PortChangeHistoryService } from './port-change-history.service';
import { PortChangeHistoryController } from './port-change-history.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PortChangeHistory]),
    AuthModule,
  ],
  providers: [PortChangeHistoryService],
  controllers: [PortChangeHistoryController],
  exports: [PortChangeHistoryService],
})
export class PortChangeHistoryModule {}
