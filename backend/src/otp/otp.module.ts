import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailOtp } from './otp.entity';
import { OtpService } from './otp.service';
import { EmailService } from './email.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([EmailOtp]), ConfigModule],
  providers: [OtpService, EmailService],
  exports: [OtpService, EmailService],
})
export class OtpModule {}
