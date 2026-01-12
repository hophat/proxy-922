import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TokensService } from '../tokens/tokens.service';
import { OtpService } from '../otp/otp.service';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
}

export interface VerifyOtpDto {
  email: string;
  code: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    quotaTotal: number;
    quotaUsed: number;
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tokensService: TokensService,
    private jwtService: JwtService,
    private otpService: OtpService,
  ) {}

  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new UnauthorizedException('Email already registered');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerDto.email)) {
      throw new UnauthorizedException('Invalid email format');
    }

    // Validate password (minimum 6 characters)
    if (registerDto.password.length < 6) {
      throw new UnauthorizedException('Password must be at least 6 characters');
    }

    // Send OTP to email
    await this.otpService.sendOtp(registerDto.email);

    return {
      success: true,
      message: 'OTP đã được gửi đến email của bạn. Vui lòng kiểm tra email và nhập mã OTP để hoàn tất đăng ký.',
    };
  }

  async verifyOtpAndRegister(verifyDto: VerifyOtpDto, password: string): Promise<RegisterResponse> {
    // Verify OTP
    const isValid = await this.otpService.verifyOtp(verifyDto.email, verifyDto.code);
    if (!isValid) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    // Check if user already exists (double check)
    const existingUser = await this.usersService.findByEmail(verifyDto.email);
    if (existingUser) {
      throw new UnauthorizedException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user (quota will be set by admin later)
    const user = await this.usersService.create(verifyDto.email, passwordHash);

    return {
      success: true,
      message: 'Đăng ký thành công! Vui lòng đăng nhập để sử dụng dịch vụ.',
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async resendOtp(email: string): Promise<{ success: boolean; message: string }> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new UnauthorizedException('Email already registered');
    }

    // Send OTP
    await this.otpService.sendOtp(email);

    return {
      success: true,
      message: 'OTP đã được gửi lại đến email của bạn',
    };
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    // Calculate expiration date
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const expiresInSeconds = this.parseExpiresIn(expiresIn);
    const expiredAt = new Date(Date.now() + expiresInSeconds * 1000);

    // Store token in database
    await this.tokensService.createToken(token, user.id, expiredAt);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        quotaTotal: user.quotaTotal,
        quotaUsed: user.quotaUsed,
      },
    };
  }

  async validateToken(token: string): Promise<{ valid: boolean; userId?: string; email?: string }> {
    try {
      // Check if token exists in database
      const tokenRecord = await this.tokensService.findByToken(token);
      if (!tokenRecord) {
        return { valid: false };
      }

      // Check if token is expired
      if (new Date() > tokenRecord.expiredAt) {
        await this.tokensService.deleteToken(token);
        return { valid: false };
      }

      // Verify JWT
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.active) {
        return { valid: false };
      }

      return {
        valid: true,
        userId: user.id,
        email: user.email,
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.active) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password (minimum 6 characters)
    if (newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.usersService.updatePassword(userId, newPasswordHash);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60; // Default 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 7 * 24 * 60 * 60;
    }
  }
}

