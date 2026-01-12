import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortMapping } from './port-mappings.entity';
import { Socks5UpstreamService } from '../socks5-upstream/socks5-upstream.service';

@Injectable()
export class PortMappingsService {
  constructor(
    @InjectRepository(PortMapping)
    private portMappingRepository: Repository<PortMapping>,
    private upstreamService: Socks5UpstreamService,
  ) {}

  async getUpstreamByMappingId(mappingId: string) {
    const mapping = await this.portMappingRepository.findOne({
      where: { id: mappingId },
      relations: ['upstream'],
    });

    if (!mapping) {
      throw new NotFoundException(`Port mapping ${mappingId} not found`);
    }

    // Get upstream credentials
    const credentials = await this.upstreamService.getUpstreamCredentials(mapping.upstream);

    return {
      id: mapping.upstream.id,
      host: mapping.upstream.host,
      port: mapping.upstream.port,
      username: credentials.username,
      password: credentials.password,
    };
  }
}
