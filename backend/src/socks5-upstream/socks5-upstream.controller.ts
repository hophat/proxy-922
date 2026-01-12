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
import { Socks5UpstreamService, CreateUpstreamDto } from './socks5-upstream.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpstreamStatus } from './socks5-upstream.entity';

@Controller('socks5-upstream')
export class Socks5UpstreamController {
  constructor(private upstreamService: Socks5UpstreamService) {}

  @Get()
  async findAll() {
    const upstreams = await this.upstreamService.findAll();
    // Mask IP for public API
    return upstreams.map((upstream) => ({
      ...upstream,
      host: this.upstreamService.maskIP(upstream.host),
      username: undefined,
      passwordEncrypted: undefined,
    }));
  }

  @Get('available')
  async findAvailable() {
    const upstreams = await this.upstreamService.findAvailable();
    // Mask IP for public API
    return upstreams.map((upstream) => ({
      ...upstream,
      host: this.upstreamService.maskIP(upstream.host),
      username: undefined,
      passwordEncrypted: undefined,
    }));
  }

  @Get('public')
  async findPublic() {
    // Public endpoint - tương thích với /proxies/public
    const upstreams = await this.upstreamService.findActive();
    return upstreams.map((upstream) => ({
      id: upstream.id,
      host: upstream.host, // Không mask vì đây là endpoint public nhưng có thể mask sau
      port: upstream.port,
      status: upstream.status,
      lastCheck: upstream.lastCheck,
      consecutiveFailures: upstream.consecutiveFailures,
    }));
  }

  @Get('public/available')
  async findAvailableForRent() {
    // Public endpoint - không cần authentication
    const upstreams = await this.upstreamService.findAvailableForRent();
    // Mask IP for public API
    return upstreams.map((upstream) => ({
      id: upstream.id,
      host: this.upstreamService.maskIP(upstream.host),
      port: upstream.port,
      country: upstream.country,
      state: upstream.state,
      city: upstream.city,
      ping: upstream.ping,
      status: upstream.status,
      createdAt: upstream.createdAt,
      updatedAt: upstream.updatedAt,
    }));
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const upstream = await this.upstreamService.findById(id);
    // Mask IP for public API
    return {
      ...upstream,
      host: this.upstreamService.maskIP(upstream.host),
      username: undefined,
      passwordEncrypted: undefined,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createDto: CreateUpstreamDto) {
    return this.upstreamService.create(createDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: Partial<CreateUpstreamDto>,
  ) {
    return this.upstreamService.update(id, updateDto);
  }

  @Put(':id/geo')
  @UseGuards(JwtAuthGuard)
  async updateGeoInfo(@Param('id', ParseUUIDPipe) id: string) {
    await this.upstreamService.updateGeoInfo(id);
    return { message: 'Geo info updated successfully' };
  }

  @Put('update-all-geo')
  @UseGuards(JwtAuthGuard)
  async updateAllGeoInfo() {
    const result = await this.upstreamService.updateAllGeoInfo();
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.upstreamService.delete(id);
    return { message: 'Upstream deleted successfully' };
  }

  @Post('import')
  @UseGuards(JwtAuthGuard)
  async import(@Body() body: { content: string }) {
    return this.upstreamService.importFromFile(body.content);
  }

  @Put(':id/health')
  async updateHealth(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isAlive: boolean; lastCheck: string },
  ) {
    const lastCheck = new Date(body.lastCheck);
    await this.upstreamService.updateHealthStatus(id, body.isAlive, lastCheck);
    return { message: 'Health status updated' };
  }

  @Get(':id/ping')
  async checkPing(@Param('id', ParseUUIDPipe) id: string) {
    const upstream = await this.upstreamService.findById(id);
    return { ping: upstream.ping };
  }
}
