import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GatewayPortsService, CreatePoolDto } from './gateway-ports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('gateway-ports')
export class GatewayPortsController {
  constructor(private gatewayPortsService: GatewayPortsService) {}

  @Get('gateway/:gatewayId')
  async findAvailable(@Param('gatewayId', ParseUUIDPipe) gatewayId: string) {
    return this.gatewayPortsService.findAvailable(gatewayId);
  }

  @Post('pool')
  @UseGuards(JwtAuthGuard)
  async createPool(@Body() createDto: CreatePoolDto) {
    return this.gatewayPortsService.createPool(createDto);
  }
}

