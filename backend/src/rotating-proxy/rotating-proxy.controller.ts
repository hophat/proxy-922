import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Headers,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RotatingProxyService, CreateRotatingProxyPurchaseDto } from './rotating-proxy.service';
import { PaymentsService, CreateRotatingProxyOrderDto } from '../payments/payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';

@Controller('rotating-proxy')
export class RotatingProxyController {
  constructor(
    private rotatingProxyService: RotatingProxyService,
    private paymentsService: PaymentsService,
    private authService: AuthService,
  ) {}

  @Post('order')
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @Body() createDto: CreateRotatingProxyOrderDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    return this.paymentsService.createRotatingProxyOrder(
      validation.userId,
      createDto,
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyRotatingProxies(@Headers('authorization') authorization: string) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    return this.rotatingProxyService.getMyRotatingProxies(validation.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getRotatingProxyById(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    return this.rotatingProxyService.getRotatingProxyById(id, validation.userId);
  }

  @Put(':id/port')
  @UseGuards(JwtAuthGuard)
  async updatePort(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { port: number },
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    return this.rotatingProxyService.updatePort(id, validation.userId, body.port);
  }

  @Put(':id/rotation-interval')
  @UseGuards(JwtAuthGuard)
  async updateRotationInterval(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { rotationInterval: number },
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    return this.rotatingProxyService.updateRotationInterval(
      id,
      validation.userId,
      body.rotationInterval,
    );
  }
}
