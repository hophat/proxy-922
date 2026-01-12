import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GatewaysService, CreateGatewayDto } from './gateways.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('gateways')
export class GatewaysController {
  constructor(private gatewaysService: GatewaysService) {}

  @Get()
  async findAll() {
    return this.gatewaysService.findAll();
  }

  @Get('public')
  async findAllPublic() {
    return this.gatewaysService.findAllPublic();
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.gatewaysService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createDto: CreateGatewayDto) {
    return this.gatewaysService.create(createDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: Partial<CreateGatewayDto>,
  ) {
    // Implementation for update if needed
    throw new Error('Update not implemented yet');
  }
}

