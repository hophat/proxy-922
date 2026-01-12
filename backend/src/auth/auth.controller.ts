import { Controller, Post, Get, Body, Headers, UseGuards } from '@nestjs/common';
import { AuthService, LoginDto, RegisterDto } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('check-token')
  async checkToken(@Headers('authorization') authorization: string) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return { valid: false };
    }

    const token = authorization.substring(7);
    return this.authService.validateToken(token);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Headers('authorization') authorization: string) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid) {
      return { error: 'Invalid token' };
    }
    return { userId: validation.userId, email: validation.email };
  }
}

