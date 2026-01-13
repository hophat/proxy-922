import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppVersion } from './app-version.entity';
import { CreateVersionDto, UpdateVersionDto } from './dto/create-version.dto';

@Injectable()
export class AppVersionService {
  constructor(
    @InjectRepository(AppVersion)
    private appVersionRepository: Repository<AppVersion>,
  ) {}

  async getLatestVersion(platform: string): Promise<AppVersion | null> {
    const version = await this.appVersionRepository.findOne({
      where: { platform },
      order: { createdAt: 'DESC' },
    });

    return version;
  }

  async create(createDto: CreateVersionDto): Promise<AppVersion> {
    const version = this.appVersionRepository.create({
      version: createDto.version,
      platform: createDto.platform,
      downloadUrl: createDto.downloadUrl,
      releaseNotes: createDto.releaseNotes,
      isMandatory: createDto.isMandatory ?? false,
      fileSize: createDto.fileSize,
      checksum: createDto.checksum,
    });

    return this.appVersionRepository.save(version);
  }

  async findAll(): Promise<AppVersion[]> {
    return this.appVersionRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<AppVersion> {
    const version = await this.appVersionRepository.findOne({ where: { id } });
    if (!version) {
      throw new NotFoundException(`App version with ID ${id} not found`);
    }
    return version;
  }

  async update(id: string, updateDto: UpdateVersionDto): Promise<AppVersion> {
    const version = await this.findById(id);

    Object.assign(version, updateDto);

    return this.appVersionRepository.save(version);
  }

  async delete(id: string): Promise<void> {
    const version = await this.findById(id);
    await this.appVersionRepository.remove(version);
  }
}
