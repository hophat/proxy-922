import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
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

  /**
   * Tìm port available trong range cho một gateway
   */
  async findAvailablePortsInRange(
    gatewayId: string,
    startPort: number,
    endPort: number,
  ): Promise<GatewayPort[]> {
    return this.portRepository.find({
      where: {
        gatewayId,
        port: Between(startPort, endPort),
        status: GatewayPortStatus.AVAILABLE,
      },
      order: { port: 'ASC' },
    });
  }

  /**
   * Tìm port available từ 3000-10000 cho một gateway
   */
  async findAvailablePortsForSelection(gatewayId: string): Promise<GatewayPort[]> {
    return this.findAvailablePortsInRange(gatewayId, 3000, 10000);
  }

  /**
   * Tìm tất cả port available từ TẤT CẢ gateways trong range 3000-10000
   * Bao gồm thông tin gateway IP
   */
  async findAllAvailablePortsInRange(
    startPort: number = 3000,
    endPort: number = 10000,
  ): Promise<Array<{ port: number; gatewayId: string; gatewayIp: string; portId: string }>> {
    const ports = await this.portRepository.find({
      where: {
        port: Between(startPort, endPort),
        status: GatewayPortStatus.AVAILABLE,
      },
      relations: ['gateway'],
      order: { port: 'ASC' },
    });

    return ports.map((p) => ({
      port: p.port,
      gatewayId: p.gatewayId,
      gatewayIp: p.gateway.ip,
      portId: p.id,
    }));
  }

  /**
   * Tìm port by ID và trả về với gateway info
   */
  async findPortWithGateway(portId: string): Promise<GatewayPort | null> {
    return this.portRepository.findOne({
      where: { id: portId },
      relations: ['gateway'],
    });
  }

  /**
   * Tìm port by port number và gatewayId
   */
  async findPortByNumber(gatewayId: string, port: number): Promise<GatewayPort | null> {
    return this.portRepository.findOne({
      where: {
        gatewayId,
        port,
      },
      relations: ['gateway'],
    });
  }
}

