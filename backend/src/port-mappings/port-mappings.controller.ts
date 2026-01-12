import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { PortMappingsService } from './port-mappings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('port-mappings')
export class PortMappingsController {
  constructor(private portMappingsService: PortMappingsService) {}

  @Get(':id/upstream')
  @UseGuards(JwtAuthGuard)
  async getUpstreamByMappingId(@Param('id', ParseUUIDPipe) id: string) {
    return this.portMappingsService.getUpstreamByMappingId(id);
  }
}
