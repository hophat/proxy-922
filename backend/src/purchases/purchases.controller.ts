import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Headers,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  PurchasesService,
  CreatePurchaseDto,
  CreateUpstreamPurchaseDto,
} from './purchases.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';

@Controller('purchases')
export class PurchasesController {
  constructor(
    private purchasesService: PurchasesService,
    private authService: AuthService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPurchase(
    @Body() createDto: CreatePurchaseDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    return this.purchasesService.createPurchase(validation.userId, createDto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyPurchases(@Headers('authorization') authorization: string) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    return this.purchasesService.getMyPurchases(validation.userId);
  }

  @Get('my/mappings')
  @UseGuards(JwtAuthGuard)
  async getMyMappings(@Headers('authorization') authorization: string) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    return this.purchasesService.getMyMappings(validation.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPurchaseById(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    return this.purchasesService.getPurchaseById(id, validation.userId);
  }

  @Post('upstream')
  @UseGuards(JwtAuthGuard)
  async createUpstreamPurchase(
    @Body() createDto: CreateUpstreamPurchaseDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    return this.purchasesService.createUpstreamPurchase(validation.userId, createDto);
  }
}
