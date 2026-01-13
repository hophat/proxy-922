import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Gateway, GatewayStatus } from '../gateways/gateways.entity';
import { GatewayPort, GatewayPortStatus } from '../gateway-ports/gateway-ports.entity';
import { PortMapping, PortMappingStatus } from '../port-mappings/port-mappings.entity';
import { UserProxyPurchase, PurchaseDuration, PurchaseStatus } from './user-proxy-purchase.entity';
import { Socks5Upstream, UpstreamStatus } from '../socks5-upstream/socks5-upstream.entity';
import { GatewaysService } from '../gateways/gateways.service';
import { GatewayPortsService } from '../gateway-ports/gateway-ports.service';
import { Socks5UpstreamService } from '../socks5-upstream/socks5-upstream.service';
import { PortChangeHistoryService } from '../port-change-history/port-change-history.service';
import { PortChangeType, PortChangeHistory } from '../port-change-history/port-change-history.entity';
import * as crypto from 'crypto';

export interface CreatePurchaseDto {
  gatewayId: string;
  portCount: number;
  duration: PurchaseDuration;
}

export interface CreateUpstreamPurchaseDto {
  upstreamIds: string[]; // Array of upstream IDs
  gatewayId?: string; // Gateway ID (optional, sẽ tự động xác định từ port nếu có selectedPorts)
  duration: PurchaseDuration;
  selectedPorts?: number[]; // Optional: Array of port numbers (4000-10000) mà user chọn. Nếu có, gateway sẽ được tự động xác định từ port
}

export interface PurchaseResponse {
  purchaseId: string;
  gateway: {
    id: string;
    ip: string;
    portRangeStart: number;
    portRangeEnd: number;
  };
  ports: Array<{
    id: string;
    port: number;
    mappingId: string;
  }>;
  credentials: {
    username: string;
    password: string;
  };
  expiresAt: Date;
  duration: PurchaseDuration;
}

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @InjectRepository(UserProxyPurchase)
    private purchaseRepository: Repository<UserProxyPurchase>,
    @InjectRepository(GatewayPort)
    private portRepository: Repository<GatewayPort>,
    @InjectRepository(PortMapping)
    private portMappingRepository: Repository<PortMapping>,
    @InjectRepository(Socks5Upstream)
    private upstreamRepository: Repository<Socks5Upstream>,
    private gatewaysService: GatewaysService,
    private gatewayPortsService: GatewayPortsService,
    private upstreamService: Socks5UpstreamService,
    private portChangeHistoryService: PortChangeHistoryService,
    private dataSource: DataSource,
  ) {}

  async createPurchase(
    userId: string,
    createDto: CreatePurchaseDto,
  ): Promise<PurchaseResponse> {
    // Validate port count
    if (createDto.portCount < 5 || createDto.portCount > 100) {
      throw new BadRequestException('Port count must be between 5 and 100');
    }

    // Validate duration
    if (!Object.values(PurchaseDuration).includes(createDto.duration)) {
      throw new BadRequestException('Invalid duration');
    }

    // Get gateway
    const gateway = await this.gatewaysService.findById(createDto.gatewayId);
    if (!gateway) {
      throw new NotFoundException('Gateway not found');
    }

    if (gateway.status !== GatewayStatus.ACTIVE) {
      throw new BadRequestException('Gateway is not active');
    }

    // Check available ports
    const availablePorts = await this.gatewayPortsService.findAvailable(
      createDto.gatewayId,
    );

    if (availablePorts.length < createDto.portCount) {
      throw new BadRequestException(
        `Not enough available ports. Available: ${availablePorts.length}, Requested: ${createDto.portCount}`,
      );
    }

    // Get available upstream proxies
    const availableUpstreams = await this.upstreamRepository.find({
      where: { status: UpstreamStatus.AVAILABLE },
      order: { ping: 'ASC' },
      take: createDto.portCount,
    });

    if (availableUpstreams.length < createDto.portCount) {
      throw new BadRequestException(
        `Not enough available upstream proxies. Available: ${availableUpstreams.length}, Requested: ${createDto.portCount}`,
      );
    }

    // Calculate expiration date
    const expiresAt = this.calculateExpirationDate(createDto.duration);

    // Generate credentials
    const credentials = this.generateCredentials(userId, gateway.id);

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Reserve ports
      const selectedPorts = availablePorts.slice(0, createDto.portCount);
      const reservedPorts: GatewayPort[] = [];

      for (const port of selectedPorts) {
        const reservedPort = await queryRunner.manager.findOne(GatewayPort, {
          where: { id: port.id },
        });

        if (!reservedPort || reservedPort.status !== GatewayPortStatus.AVAILABLE) {
          throw new BadRequestException(`Port ${port.port} is no longer available`);
        }

        reservedPort.status = GatewayPortStatus.RESERVED;
        await queryRunner.manager.save(reservedPort);
        reservedPorts.push(reservedPort);
      }

      // Create port mappings and purchases
      const portMappings: PortMapping[] = [];
      const purchases: UserProxyPurchase[] = [];

      for (let i = 0; i < createDto.portCount; i++) {
        const port = reservedPorts[i];
        const upstream = availableUpstreams[i];

        // Create port mapping
        const portMapping = queryRunner.manager.create(PortMapping, {
          gatewayId: gateway.id,
          portId: port.id,
          port: port.port,
          upstreamId: upstream.id,
          userId,
          assignedAt: new Date(),
          expiresAt,
          status: PortMappingStatus.ACTIVE,
        });

        const savedMapping = await queryRunner.manager.save(portMapping);
        portMappings.push(savedMapping);

        // Assign port
        port.status = GatewayPortStatus.ASSIGNED;
        await queryRunner.manager.save(port);

        // Create purchase record
        const purchase = queryRunner.manager.create(UserProxyPurchase, {
          userId,
          gatewayId: gateway.id,
          portId: port.id,
          mappingId: savedMapping.id,
          purchasedAt: new Date(),
          expiresAt,
          duration: createDto.duration,
          price: this.calculatePrice(createDto.portCount, createDto.duration),
          status: PurchaseStatus.ACTIVE,
          gatewayUsername: credentials.username,
          gatewayPassword: credentials.password,
        });

        const savedPurchase = await queryRunner.manager.save(purchase);
        purchases.push(savedPurchase);
      }

      await queryRunner.commitTransaction();

      // Return response
      return {
        purchaseId: purchases[0].id, // Use first purchase ID as main purchase ID
        gateway: {
          id: gateway.id,
          ip: gateway.ip,
          portRangeStart: gateway.portRangeStart,
          portRangeEnd: gateway.portRangeEnd,
        },
        ports: portMappings.map((mapping, index) => ({
          id: reservedPorts[index].id,
          port: mapping.port,
          mappingId: mapping.id,
        })),
        credentials,
        expiresAt,
        duration: createDto.duration,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create purchase: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getMyPurchases(userId: string): Promise<UserProxyPurchase[]> {
    return this.purchaseRepository.find({
      where: { userId },
      relations: ['gateway', 'port', 'mapping'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPurchaseById(purchaseId: string, userId: string): Promise<UserProxyPurchase> {
    const purchase = await this.purchaseRepository.findOne({
      where: { id: purchaseId, userId },
      relations: ['gateway', 'port', 'mapping'],
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    return purchase;
  }

  async getMyMappings(userId: string) {
    // Query port mappings với relations
    const mappings = await this.portMappingRepository.find({
      where: {
        userId,
        status: PortMappingStatus.ACTIVE,
      },
      relations: ['gateway', 'upstream'],
      order: { createdAt: 'DESC' },
    });

    // Get purchases để lấy credentials
    const purchases = await this.purchaseRepository.find({
      where: { userId },
      select: ['mappingId', 'gatewayUsername', 'gatewayPassword'],
    });

    // Create map mappingId -> credentials
    const credentialsMap = new Map<string, { username: string; password: string }>();
    for (const purchase of purchases) {
      if (purchase.mappingId && !credentialsMap.has(purchase.mappingId)) {
        credentialsMap.set(purchase.mappingId, {
          username: purchase.gatewayUsername,
          password: purchase.gatewayPassword,
        });
      }
    }

    // Format response
    return {
      mappings: mappings.map((mapping) => {
        const credentials = credentialsMap.get(mapping.id) || { username: '', password: '' };
        return {
          mappingId: mapping.id,
          gatewayIp: mapping.gateway.ip,
          gatewayPort: 8080, // Gateway port is fixed
          localPort: mapping.port, // Use port from mapping as localPort (4000-10000 range)
          username: credentials.username,
          password: credentials.password,
          upstreamId: mapping.upstream.id,
          upstreamHost: mapping.upstream.host,
          upstreamPort: mapping.upstream.port,
          status: mapping.status,
          expiresAt: mapping.expiresAt,
        };
      }),
    };
  }

  /**
   * Đổi port của port mapping đang sử dụng (giữ nguyên gateway)
   * Không phụ thuộc vào GatewayPort entity - chỉ validate port number và check duplicate
   */
  async changePortMappingPort(
    mappingId: string,
    newPort: number,
    userId: string,
  ): Promise<PortMapping> {
    // Tìm port mapping
    const mapping = await this.portMappingRepository.findOne({
      where: { id: mappingId, userId },
      relations: ['gateway'],
    });

    if (!mapping) {
      throw new NotFoundException('Port mapping not found');
    }

    // Validate port range (4000-10000)
    if (newPort < 4000 || newPort > 10000) {
      throw new BadRequestException('Port must be between 4000 and 10000');
    }

    // Kiểm tra port đã được sử dụng trong gateway này chưa (trừ port hiện tại)
    this.logger.log(`[ChangePort] Checking if port ${newPort} is already used in gateway ${mapping.gatewayId}`);
    const existingMapping = await this.portMappingRepository.findOne({
      where: {
        gatewayId: mapping.gatewayId,
        port: newPort,
        status: PortMappingStatus.ACTIVE,
      },
    });

    if (existingMapping && existingMapping.id !== mappingId) {
      this.logger.warn(`[ChangePort] Port ${newPort} is already used by mapping ${existingMapping.id}`);
      throw new BadRequestException(
        `Port ${newPort} đã được sử dụng trong gateway hiện tại. Vui lòng chọn port khác.`,
      );
    }
    this.logger.log(`[ChangePort] Port ${newPort} is available`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldPortNumber = mapping.port;

      this.logger.log(`[ChangePort] Starting transaction for mapping ${mappingId}, changing port from ${oldPortNumber} to ${newPort}`);

      // Load relations trong transaction để tránh phải reload sau
      const mappingWithRelations = await queryRunner.manager.findOne(PortMapping, {
        where: { id: mappingId },
        relations: ['gateway', 'upstream'],
      });

      if (!mappingWithRelations) {
        throw new NotFoundException('Port mapping not found');
      }

      // Update mapping - chỉ cần update port number
      mappingWithRelations.port = newPort;
      const updatedMapping = await queryRunner.manager.save(mappingWithRelations);
      this.logger.log(`[ChangePort] Updated mapping port to ${newPort}`);

      // Record change history - sử dụng queryRunner.manager để tránh deadlock
      const changeHistory = queryRunner.manager.create(PortChangeHistory, {
        userId,
        gatewayId: mapping.gatewayId,
        portMappingId: mappingId,
        oldPort: oldPortNumber,
        newPort,
        oldGatewayId: null,
        newGatewayId: null,
        changeType: PortChangeType.PORT_CHANGE,
        changedAt: new Date(),
      });
      await queryRunner.manager.save(changeHistory);
      this.logger.log(`[ChangePort] Recorded port change history`);

      await queryRunner.commitTransaction();
      this.logger.log(`[ChangePort] Transaction committed successfully`);

      // Trả về mapping đã được update với relations đã load
      return updatedMapping;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to change port for port mapping: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Đổi gateway IP của port mapping đang sử dụng
   */
  async changePortMappingGateway(
    mappingId: string,
    newGatewayId: string,
    userId: string,
  ): Promise<PortMapping> {
    // Tìm port mapping
    const mapping = await this.portMappingRepository.findOne({
      where: { id: mappingId, userId },
      relations: ['gateway', 'gatewayPort'],
    });

    if (!mapping) {
      throw new NotFoundException('Port mapping not found');
    }

    if (mapping.status !== PortMappingStatus.ACTIVE) {
      throw new BadRequestException('Port mapping is not active');
    }

    // Validate new gateway
    const newGateway = await this.gatewaysService.findById(newGatewayId);
    if (!newGateway) {
      throw new NotFoundException('New gateway not found');
    }

    if (newGateway.status !== GatewayStatus.ACTIVE) {
      throw new BadRequestException('New gateway is not active');
    }

    // Tìm port tương ứng trong gateway mới (cùng port number)
    const newPort = await this.gatewayPortsService.findPortByNumber(newGatewayId, mapping.port);

    if (!newPort || newPort.status !== GatewayPortStatus.AVAILABLE) {
      throw new BadRequestException(
        `Port ${mapping.port} không available trong gateway mới`,
      );
    }

    // Use transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldGatewayId = mapping.gatewayId;
      const oldPortId = mapping.portId;

      // Release old port
      const oldPort = await queryRunner.manager.findOne(GatewayPort, {
        where: { id: oldPortId },
      });
      if (oldPort) {
        oldPort.status = GatewayPortStatus.AVAILABLE;
        await queryRunner.manager.save(oldPort);
      }

      // Reserve new port
      newPort.status = GatewayPortStatus.RESERVED;
      await queryRunner.manager.save(newPort);

      // Update mapping
      mapping.gatewayId = newGatewayId;
      mapping.portId = newPort.id;
      const updatedMapping = await queryRunner.manager.save(mapping);

      // Assign new port
      newPort.status = GatewayPortStatus.ASSIGNED;
      await queryRunner.manager.save(newPort);

      // Update purchase records
      const purchases = await queryRunner.manager.find(UserProxyPurchase, {
        where: { mappingId },
      });

      // Generate new credentials cho gateway mới
      const newCredentials = this.generateCredentials(userId, newGatewayId);

      for (const purchase of purchases) {
        purchase.gatewayId = newGatewayId;
        purchase.portId = newPort.id;
        purchase.gatewayUsername = newCredentials.username;
        purchase.gatewayPassword = newCredentials.password;
        await queryRunner.manager.save(purchase);
      }

      // Record change history - use queryRunner to ensure it's in the same transaction
      const changeHistory = queryRunner.manager.create(PortChangeHistory, {
        userId,
        gatewayId: newGatewayId,
        portMappingId: mappingId,
        oldGatewayId,
        newGatewayId,
        oldPort: null,
        newPort: null,
        changeType: PortChangeType.GATEWAY_CHANGE,
        changedAt: new Date(),
      });
      await queryRunner.manager.save(changeHistory);

      await queryRunner.commitTransaction();

      // Reload với relations
      return this.portMappingRepository.findOne({
        where: { id: mappingId },
        relations: ['gateway', 'upstream', 'gatewayPort'],
      }) as Promise<PortMapping>;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to change gateway for port mapping: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private calculateExpirationDate(duration: PurchaseDuration): Date {
    const now = new Date();
    switch (duration) {
      case PurchaseDuration.HOURS_24:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case PurchaseDuration.DAYS_7:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case PurchaseDuration.DAYS_30:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private calculatePrice(portCount: number, duration: PurchaseDuration): number {
    // Base price per port per day
    const basePricePerPortPerDay = 0.1;

    let days = 1;
    switch (duration) {
      case PurchaseDuration.HOURS_24:
        days = 1;
        break;
      case PurchaseDuration.DAYS_7:
        days = 7;
        break;
      case PurchaseDuration.DAYS_30:
        days = 30;
        break;
    }

    return Number((portCount * basePricePerPortPerDay * days).toFixed(2));
  }

  private generateCredentials(userId: string, gatewayId: string): {
    username: string;
    password: string;
  } {
    // Generate username: user_{userId}_{timestamp}
    const timestamp = Date.now();
    const username = `user_${userId.substring(0, 8)}_${timestamp}`;

    // Generate password: random 16 character string
    const password = crypto.randomBytes(8).toString('hex');

    return { username, password };
  }

  async createUpstreamPurchase(
    userId: string,
    createDto: CreateUpstreamPurchaseDto,
  ): Promise<PurchaseResponse> {
    // Validate upstreamIds
    if (!createDto.upstreamIds || createDto.upstreamIds.length === 0) {
      throw new BadRequestException('At least one upstream ID is required');
    }

    if (createDto.upstreamIds.length > 100) {
      throw new BadRequestException('Maximum 100 upstreams per purchase');
    }

    // Validate duration
    if (!Object.values(PurchaseDuration).includes(createDto.duration)) {
      throw new BadRequestException('Invalid duration');
    }

    // Validate selectedPorts nếu có
    if (createDto.selectedPorts) {
      if (createDto.selectedPorts.length !== createDto.upstreamIds.length) {
        throw new BadRequestException(
          `Số lượng port phải bằng số lượng upstream. Port: ${createDto.selectedPorts.length}, Upstream: ${createDto.upstreamIds.length}`,
        );
      }

      // Validate port range 4000-10000
      for (const port of createDto.selectedPorts) {
        if (port < 4000 || port > 10000) {
          throw new BadRequestException(`Port ${port} phải trong range 4000-10000`);
        }
      }
    }

    // Validate and get upstreams
    const upstreams: Socks5Upstream[] = [];
    for (const upstreamId of createDto.upstreamIds) {
      const upstream = await this.upstreamService.findById(upstreamId);

      // Check upstream status
      if (upstream.status !== UpstreamStatus.AVAILABLE) {
        throw new BadRequestException(`Upstream ${upstreamId} is not available`);
      }

      // Check if upstream is already rented
      const isRented = await this.upstreamService.isUpstreamRented(upstreamId);
      if (isRented) {
        throw new BadRequestException(`Upstream ${upstreamId} is already rented`);
      }

      upstreams.push(upstream);
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let reservedPorts: GatewayPort[] = [];
      let gateway: Gateway;

      if (createDto.selectedPorts) {
        // User đã chọn port cụ thể
        // Cần gatewayId để assign port (nếu không có, tự động chọn gateway đầu tiên)
        if (createDto.gatewayId) {
          gateway = await this.gatewaysService.findById(createDto.gatewayId);
        } else {
          // Auto-select first active gateway
          const gateways = await this.gatewaysService.findAll();
          const activeGateways = gateways.filter((g) => g.status === GatewayStatus.ACTIVE);
          if (activeGateways.length === 0) {
            throw new NotFoundException('No active gateway found');
          }
          gateway = activeGateways[0];
        }

        if (gateway.status !== GatewayStatus.ACTIVE) {
          throw new BadRequestException('Gateway is not active');
        }

        // Validate ports không bị duplicate trong gateway này
        for (const portNumber of createDto.selectedPorts) {
          const existingMapping = await this.portMappingRepository.findOne({
            where: {
              gatewayId: gateway.id,
              port: portNumber,
              status: PortMappingStatus.ACTIVE,
            },
          });

          if (existingMapping) {
            throw new BadRequestException(
              `Port ${portNumber} đã được sử dụng trong gateway ${gateway.ip}. Vui lòng chọn port khác.`,
            );
          }
        }

        // Không cần reserve GatewayPort nữa - chỉ cần validate
        reservedPorts = [];
      } else {
        // Auto-assign gateway và port
        if (createDto.gatewayId) {
          gateway = await this.gatewaysService.findById(createDto.gatewayId);
        } else {
          // Auto-select first active gateway
          const gateways = await this.gatewaysService.findAll();
          const activeGateways = gateways.filter((g) => g.status === GatewayStatus.ACTIVE);
          if (activeGateways.length === 0) {
            throw new NotFoundException('No active gateway found');
          }
          gateway = activeGateways[0];
        }

        if (gateway.status !== GatewayStatus.ACTIVE) {
          throw new BadRequestException('Gateway is not active');
        }

        // Tìm port available trong gateway (không bị sử dụng)
        const existingMappings = await this.portMappingRepository.find({
          where: {
            gatewayId: gateway.id,
            status: PortMappingStatus.ACTIVE,
          },
          select: ['port'],
        });

        const usedPorts = new Set(existingMappings.map((m) => m.port));
        const availablePorts: number[] = [];

        // Tìm port từ 4000-10000 chưa được sử dụng
        for (let port = 4000; port <= 10000 && availablePorts.length < createDto.upstreamIds.length; port++) {
          if (!usedPorts.has(port)) {
            availablePorts.push(port);
          }
        }

        if (availablePorts.length < createDto.upstreamIds.length) {
          throw new BadRequestException(
            `Not enough available ports in gateway. Available: ${availablePorts.length}, Requested: ${createDto.upstreamIds.length}`,
          );
        }

        // Không cần reserve GatewayPort nữa - chỉ cần port numbers
        reservedPorts = [];
      }

      // Calculate expiration date
      const expiresAt = this.calculateExpirationDate(createDto.duration);

      // Create port mappings and purchases
      const portMappings: PortMapping[] = [];
      const purchases: UserProxyPurchase[] = [];

      // Generate credentials cho gateway
      const credentials = this.generateCredentials(userId, gateway.id);

      // Xác định port numbers
      const portNumbers: number[] = createDto.selectedPorts || [];
      if (portNumbers.length === 0) {
        // Auto-assign: tìm port chưa được sử dụng
        const existingMappings = await queryRunner.manager.find(PortMapping, {
          where: {
            gatewayId: gateway.id,
            status: PortMappingStatus.ACTIVE,
          },
          select: ['port'],
        });
        const usedPorts = new Set(existingMappings.map((m) => m.port));
        
        for (let port = 4000; port <= 10000 && portNumbers.length < createDto.upstreamIds.length; port++) {
          if (!usedPorts.has(port)) {
            portNumbers.push(port);
          }
        }
      }

      for (let i = 0; i < createDto.upstreamIds.length; i++) {
        const portNumber = portNumbers[i];
        const upstream = upstreams[i];

        // Create port mapping - không cần portId
        const portMapping = queryRunner.manager.create(PortMapping, {
          gatewayId: gateway.id,
          portId: null, // Không phụ thuộc GatewayPort entity
          port: portNumber,
          upstreamId: upstream.id,
          userId,
          assignedAt: new Date(),
          expiresAt,
          status: PortMappingStatus.ACTIVE,
        });

        const savedMapping = await queryRunner.manager.save(portMapping);
        portMappings.push(savedMapping);

        // Record port change history - use queryRunner to ensure it's in the same transaction
        const portChangeHistory = queryRunner.manager.create(PortChangeHistory, {
          userId,
          gatewayId: gateway.id,
          portMappingId: savedMapping.id,
          oldPort: null,
          newPort: portNumber,
          changeType: PortChangeType.PORT_CHANGE,
          changedAt: new Date(),
        });
        await queryRunner.manager.save(portChangeHistory);

        // Update upstream status to IN_USE
        upstream.status = UpstreamStatus.IN_USE;
        await queryRunner.manager.save(upstream);

        // Create purchase record
        const purchase = queryRunner.manager.create(UserProxyPurchase, {
          userId,
          gatewayId: gateway.id,
          portId: null, // Có thể null
          mappingId: savedMapping.id,
          purchasedAt: new Date(),
          expiresAt,
          duration: createDto.duration,
          price: this.calculatePrice(createDto.upstreamIds.length, createDto.duration) / createDto.upstreamIds.length,
          status: PurchaseStatus.ACTIVE,
          gatewayUsername: credentials.username,
          gatewayPassword: credentials.password,
        });

        const savedPurchase = await queryRunner.manager.save(purchase);
        purchases.push(savedPurchase);
      }

      await queryRunner.commitTransaction();

      // Return response (dùng gateway đầu tiên làm main gateway)
      return {
        purchaseId: purchases[0].id, // Use first purchase ID as main purchase ID
        gateway: {
          id: gateway.id,
          ip: gateway.ip,
          portRangeStart: gateway.portRangeStart,
          portRangeEnd: gateway.portRangeEnd,
        },
        ports: portMappings.map((mapping) => ({
          id: mapping.id, // Dùng mapping ID thay vì port ID
          port: mapping.port,
          mappingId: mapping.id,
        })),
        credentials,
        expiresAt,
        duration: createDto.duration,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create upstream purchase: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Kiểm tra và expire các purchases đã hết hạn
   * Method này sẽ được gọi định kỳ bởi scheduled task
   */
  async expireExpiredPurchases(): Promise<void> {
    const now = new Date();
    
    // Tìm tất cả purchases đang ACTIVE nhưng đã hết hạn
    const expiredPurchases = await this.purchaseRepository
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.mapping', 'mapping')
      .leftJoinAndSelect('purchase.port', 'port')
      .leftJoinAndSelect('mapping.upstream', 'upstream')
      .where('purchase.status = :status', { status: PurchaseStatus.ACTIVE })
      .andWhere('purchase.expires_at < :now', { now })
      .getMany();

    if (expiredPurchases.length === 0) {
      return;
    }

    this.logger.log(`Found ${expiredPurchases.length} expired purchases to process`);

    for (const purchase of expiredPurchases) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Cập nhật purchase status
        purchase.status = PurchaseStatus.EXPIRED;
        await queryRunner.manager.save(purchase);

        // Cập nhật port mapping status nếu có
        if (purchase.mapping) {
          purchase.mapping.status = PortMappingStatus.EXPIRED;
          await queryRunner.manager.save(purchase.mapping);
        }

        // Release port về AVAILABLE
        if (purchase.port) {
          purchase.port.status = GatewayPortStatus.AVAILABLE;
          await queryRunner.manager.save(purchase.port);
        }

        // Release upstream về AVAILABLE nếu có
        if (purchase.mapping?.upstream) {
          purchase.mapping.upstream.status = UpstreamStatus.AVAILABLE;
          await queryRunner.manager.save(purchase.mapping.upstream);
        }

        await queryRunner.commitTransaction();
        this.logger.log(`Expired purchase: ${purchase.id}`);
      } catch (error: any) {
        await queryRunner.rollbackTransaction();
        this.logger.error(
          `Failed to expire purchase ${purchase.id}: ${error.message}`,
          error.stack,
        );
      } finally {
        await queryRunner.release();
      }
    }
  }
}
