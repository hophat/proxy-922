import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gateway, GatewayStatus } from './gateways.entity';
import { GatewayPortsService } from '../gateway-ports/gateway-ports.service';

export interface CreateGatewayDto {
  ip: string;
  portRangeStart: number;
  portRangeEnd: number;
}

export interface PublicGatewayDto {
  id: string;
  ipMasked: string;
  portRangeStart: number;
  portRangeEnd: number;
  availablePortCount: number;
  status: GatewayStatus;
}

@Injectable()
export class GatewaysService {
  constructor(
    @InjectRepository(Gateway)
    private gatewayRepository: Repository<Gateway>,
    @Inject(forwardRef(() => GatewayPortsService))
    private gatewayPortsService: GatewayPortsService,
  ) {}

  async create(createDto: CreateGatewayDto): Promise<Gateway> {
    const gateway = this.gatewayRepository.create({
      ip: createDto.ip,
      portRangeStart: createDto.portRangeStart,
      portRangeEnd: createDto.portRangeEnd,
      status: GatewayStatus.ACTIVE,
    });
    return this.gatewayRepository.save(gateway);
  }

  async findAll(): Promise<Gateway[]> {
    return this.gatewayRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Gateway> {
    const gateway = await this.gatewayRepository.findOne({ where: { id } });
    if (!gateway) {
      throw new NotFoundException(`Gateway with ID ${id} not found`);
    }
    return gateway;
  }

  async getAvailablePortCount(gatewayId: string): Promise<number> {
    return this.gatewayPortsService.getAvailablePortCount(gatewayId);
  }

  maskIp(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      // Format: 192.168.1.***
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
    return ip;
  }

  async findAllPublic(): Promise<PublicGatewayDto[]> {
    const gateways = await this.gatewayRepository.find({
      where: { status: GatewayStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    const publicGateways: PublicGatewayDto[] = [];

    for (const gateway of gateways) {
      const availablePortCount = await this.getAvailablePortCount(gateway.id);
      publicGateways.push({
        id: gateway.id,
        ipMasked: this.maskIp(gateway.ip),
        portRangeStart: gateway.portRangeStart,
        portRangeEnd: gateway.portRangeEnd,
        availablePortCount,
        status: gateway.status,
      });
    }

    return publicGateways;
  }
}

