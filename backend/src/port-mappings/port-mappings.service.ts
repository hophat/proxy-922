import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortMapping } from './port-mappings.entity';
import { Socks5UpstreamService } from '../socks5-upstream/socks5-upstream.service';
import { GatewayPortsService } from '../gateway-ports/gateway-ports.service';

@Injectable()
export class PortMappingsService {
  constructor(
    @InjectRepository(PortMapping)
    private portMappingRepository: Repository<PortMapping>,
    private upstreamService: Socks5UpstreamService,
    private gatewayPortsService: GatewayPortsService,
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

  /**
   * Lấy danh sách port available từ TẤT CẢ gateways trong range 3000-10000
   */
  async getAvailablePorts(): Promise<
    Array<{ port: number; gatewayId: string; gatewayIp: string; portId: string }>
  > {
    return this.gatewayPortsService.findAllAvailablePortsInRange(3000, 10000);
  }
}
