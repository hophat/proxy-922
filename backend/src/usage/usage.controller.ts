import { Controller, Post, Get, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { UsageService, UsageDto } from './usage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('usage')
export class UsageController {
  constructor(private usageService: UsageService) {}

  @Post()
  async logUsage(@Body() usageDto: UsageDto) {
    return this.usageService.logUsage(usageDto);
  }

  @Get('users/:id/quota')
  @UseGuards(JwtAuthGuard)
  async getQuota(@Param('id', ParseUUIDPipe) id: string) {
    return this.usageService.checkQuota(id);
  }
}

