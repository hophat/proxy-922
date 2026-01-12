import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { EmailOtp } from './otp.entity';
import { EmailService } from './email.service';
import * as crypto from 'crypto';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly OTP_LENGTH = 6;

  constructor(
    @InjectRepository(EmailOtp)
    private otpRepository: Repository<EmailOtp>,
    private emailService: EmailService,
  ) {}

  /**
   * Generate a random 6-digit OTP code
   */
  private generateOtpCode(): string {
    // Generate random 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    return code;
  }

  /**
   * Create and send OTP to email
   */
  async sendOtp(email: string): Promise<{ code: string; expiresAt: Date }> {
    // Invalidate any existing unused OTPs for this email
    await this.otpRepository.update(
      { email, used: false },
      { used: true },
    );

    // Generate new OTP
    const code = this.generateOtpCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    // Save OTP to database
    const otp = this.otpRepository.create({
      email,
      code,
      expiresAt,
      used: false,
    });

    await this.otpRepository.save(otp);

    // Send OTP via email
    try {
      await this.emailService.sendOtpEmail(email, code);
    } catch (error: any) {
      // If email sending fails, delete the OTP record
      await this.otpRepository.delete({ id: otp.id });
      throw error;
    }

    this.logger.log(`OTP created for ${email}, expires at ${expiresAt}`);

    // Return code for development/testing (should not return in production)
    return {
      code: process.env.NODE_ENV === 'development' ? code : '***',
      expiresAt,
    };
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(email: string, code: string): Promise<boolean> {
    // Find the most recent unused OTP for this email
    const otp = await this.otpRepository.findOne({
      where: { email, used: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      this.logger.warn(`No OTP found for ${email}`);
      return false;
    }

    // Check if OTP is expired
    if (new Date() > otp.expiresAt) {
      this.logger.warn(`OTP expired for ${email}`);
      // Mark as used even though expired
      await this.otpRepository.update({ id: otp.id }, { used: true });
      return false;
    }

    // Check if code matches
    if (otp.code !== code) {
      this.logger.warn(`Invalid OTP code for ${email}`);
      return false;
    }

    // Mark OTP as used
    await this.otpRepository.update(
      { id: otp.id },
      { used: true, usedAt: new Date() },
    );

    this.logger.log(`OTP verified successfully for ${email}`);
    return true;
  }

  /**
   * Clean up expired OTPs (can be called by a scheduler)
   */
  async cleanupExpiredOtps(): Promise<void> {
    const deleted = await this.otpRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    if (deleted.affected && deleted.affected > 0) {
      this.logger.log(`Cleaned up ${deleted.affected} expired OTPs`);
    }
  }
}
