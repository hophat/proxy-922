import { Controller, Get, Param, UseGuards, ParseUUIDPipe, Headers } from '@nestjs/common';
import { PortChangeHistoryService } from './port-change-history.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';

@Controller('port-change-history')
export class PortChangeHistoryController {
  constructor(
    private portChangeHistoryService: PortChangeHistoryService,
    private authService: AuthService,
  ) {}

  @Get('cooldown/:gatewayId')
  @UseGuards(JwtAuthGuard)
  async checkCooldown(
    @Param('gatewayId', ParseUUIDPipe) gatewayId: string,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error('Invalid token');
    }

    return this.portChangeHistoryService.checkCooldown(validation.userId, gatewayId);
  }
}
