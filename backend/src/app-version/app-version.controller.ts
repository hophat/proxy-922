import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AppVersionService } from './app-version.service';
import { CreateVersionDto, UpdateVersionDto } from './dto/create-version.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('app')
export class AppVersionController {
  constructor(private appVersionService: AppVersionService) {}

  @Get('version')
  async getLatestVersion(@Query('platform') platform: string) {
    if (!platform) {
      return { error: 'Platform parameter is required' };
    }

    const version = await this.appVersionService.getLatestVersion(platform);
    
    if (!version) {
      return { 
        hasUpdate: false,
        message: 'No version found for this platform' 
      };
    }

    return {
      hasUpdate: true,
      version: version.version,
      platform: version.platform,
      downloadUrl: version.downloadUrl,
      releaseNotes: version.releaseNotes,
      isMandatory: version.isMandatory,
      fileSize: version.fileSize,
      checksum: version.checksum,
      createdAt: version.createdAt,
    };
  }

  @Get('versions')
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.appVersionService.findAll();
  }

  @Get('versions/:id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.appVersionService.findById(id);
  }

  @Post('versions')
  @UseGuards(JwtAuthGuard)
  async create(@Body() createDto: CreateVersionDto) {
    return this.appVersionService.create(createDto);
  }

  @Put('versions/:id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateVersionDto,
  ) {
    return this.appVersionService.update(id, updateDto);
  }

  @Delete('versions/:id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.appVersionService.delete(id);
    return { message: 'App version deleted successfully' };
  }
}
