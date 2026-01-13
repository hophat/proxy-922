import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppVersion } from './app-version.entity';
import { AppVersionService } from './app-version.service';
import { AppVersionController } from './app-version.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AppVersion])],
  controllers: [AppVersionController],
  providers: [AppVersionService],
  exports: [AppVersionService],
})
export class AppVersionModule {}
