import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GatewayPort, GatewayPortStatus } from './gateway-ports.entity';
import { GatewaysService } from '../gateways/gateways.service';

export interface CreatePoolDto {
  gatewayId: string;
  startPort: number;
  endPort: number;
}

@Injectable()
export class GatewayPortsService {
  constructor(
    @InjectRepository(GatewayPort)
    private portRepository: Repository<GatewayPort>,
    @Inject(forwardRef(() => GatewaysService))
    private gatewaysService: GatewaysService,
  ) {}

  async createPool(createDto: CreatePoolDto): Promise<GatewayPort[]> {
    const gateway = await this.gatewaysService.findById(createDto.gatewayId);

    if (createDto.startPort > createDto.endPort) {
      throw new BadRequestException('Start port must be less than or equal to end port');
    }

    if (createDto.startPort < gateway.portRangeStart || createDto.endPort > gateway.portRangeEnd) {
      throw new BadRequestException('Port range must be within gateway port range');
    }

    const ports: GatewayPort[] = [];
    for (let port = createDto.startPort; port <= createDto.endPort; port++) {
      // Check if port already exists
      const existing = await this.portRepository.findOne({
        where: { gatewayId: createDto.gatewayId, port },
      });

      if (!existing) {
        const gatewayPort = this.portRepository.create({
          gatewayId: createDto.gatewayId,
          port,
          status: GatewayPortStatus.AVAILABLE,
        });
        ports.push(gatewayPort);
      }
    }

    return this.portRepository.save(ports);
  }

  async findAvailable(gatewayId: string): Promise<GatewayPort[]> {
    return this.portRepository.find({
      where: {
        gatewayId,
        status: GatewayPortStatus.AVAILABLE,
      },
      order: { port: 'ASC' },
    });
  }

  async reservePort(portId: string): Promise<GatewayPort> {
    const port = await this.portRepository.findOne({ where: { id: portId } });
    if (!port) {
      throw new NotFoundException(`Port with ID ${portId} not found`);
    }

    if (port.status !== GatewayPortStatus.AVAILABLE) {
      throw new BadRequestException(`Port ${portId} is not available`);
    }

    port.status = GatewayPortStatus.RESERVED;
    return this.portRepository.save(port);
  }

  async assignPort(portId: string): Promise<GatewayPort> {
    const port = await this.portRepository.findOne({ where: { id: portId } });
    if (!port) {
      throw new NotFoundException(`Port with ID ${portId} not found`);
    }

    port.status = GatewayPortStatus.ASSIGNED;
    return this.portRepository.save(port);
  }

  async releasePort(portId: string): Promise<GatewayPort> {
    const port = await this.portRepository.findOne({ where: { id: portId } });
    if (!port) {
      throw new NotFoundException(`Port with ID ${portId} not found`);
    }

    port.status = GatewayPortStatus.AVAILABLE;
    return this.portRepository.save(port);
  }

  async getAvailablePortCount(gatewayId: string): Promise<number> {
    return this.portRepository.count({
      where: {
        gatewayId,
        status: GatewayPortStatus.AVAILABLE,
      },
    });
  }
}

