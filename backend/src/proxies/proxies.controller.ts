import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProxiesService, CreateProxyDto } from './proxies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('proxies')
export class ProxiesController {
  constructor(private proxiesService: ProxiesService) {}

  @Get('public')
  async findPublic() {
    // Public endpoint - không cần authentication
    return this.proxiesService.findActive();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.proxiesService.findAll();
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  async findActive() {
    return this.proxiesService.findActive();
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.proxiesService.findById(id);
  }

  @Post()
  async create(@Body() createDto: CreateProxyDto) {
    return this.proxiesService.create(createDto);
  }

  @Post('import')
  async import(@Body() body: { content: string }) {
    return this.proxiesService.importFromFile(body.content);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: Partial<CreateProxyDto>,
  ) {
    return this.proxiesService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.proxiesService.delete(id);
    return { message: 'Proxy deleted successfully' };
  }

  @Put(':id/health')
  async updateHealth(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isAlive: boolean; lastCheck: string },
  ) {
    const lastCheck = new Date(body.lastCheck);
    await this.proxiesService.updateHealthStatus(id, body.isAlive, lastCheck);
    return { message: 'Health status updated' };
  }
}
