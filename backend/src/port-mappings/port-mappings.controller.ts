import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Headers,
} from '@nestjs/common';
import { PortMappingsService } from './port-mappings.service';
import { PurchasesService } from '../purchases/purchases.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';

@Controller('port-mappings')
export class PortMappingsController {
  constructor(
    private portMappingsService: PortMappingsService,
    private purchasesService: PurchasesService,
    private authService: AuthService,
  ) {}

  @Get('available-ports')
  @UseGuards(JwtAuthGuard)
  async getAvailablePorts() {
    return this.portMappingsService.getAvailablePorts();
  }

  @Get(':id/upstream')
  @UseGuards(JwtAuthGuard)
  async getUpstreamByMappingId(@Param('id', ParseUUIDPipe) id: string) {
    return this.portMappingsService.getUpstreamByMappingId(id);
  }

  @Put(':id/port')
  @UseGuards(JwtAuthGuard)
  async changePort(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { port: number },
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    return this.purchasesService.changePortMappingPort(id, body.port, validation.userId);
  }
}
