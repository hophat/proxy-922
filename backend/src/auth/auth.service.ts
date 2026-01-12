import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TokensService } from '../tokens/tokens.service';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
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

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Create user (quota will be set by admin later)
    const user = await this.usersService.create(registerDto.email, passwordHash);

    return {
      success: true,
      message: 'Registration successful. Please contact admin to activate your account and set quota.',
      user: {
        id: user.id,
        email: user.email,
      },
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

