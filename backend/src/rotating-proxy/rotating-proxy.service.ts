import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RotatingProxyPurchase } from './rotating-proxy-purchase.entity';
import { PaymentOrder, PaymentOrderStatus } from '../payments/payment-order.entity';
import { PurchaseDuration, PurchaseStatus } from '../purchases/user-proxy-purchase.entity';
import * as crypto from 'crypto';

export interface CreateRotatingProxyPurchaseDto {
  proxyCount: number;
  duration: PurchaseDuration;
}

export enum RotationInterval {
  MINUTE_1 = 1,
  MINUTE_2 = 2,
  MINUTE_5 = 5,
}

export interface RotatingProxyResponse {
  id: string;
  domain: string;
  ip: string; // Public IP of the machine
  port: number | null;
  mappingId: string | null;
  rotationInterval: number | null;
  expiresAt: Date;
  duration: PurchaseDuration;
  status: PurchaseStatus;
}

@Injectable()
export class RotatingProxyService {
  private readonly logger = new Logger(RotatingProxyService.name);

  constructor(
    @InjectRepository(RotatingProxyPurchase)
    private rotatingProxyRepository: Repository<RotatingProxyPurchase>,
    @InjectRepository(PaymentOrder)
    private paymentOrderRepository: Repository<PaymentOrder>,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  // API key generation removed - no longer using API keys

  /**
   * Get available port from range 11000-15000
   * Returns null if no port available
   * @param queryRunner Optional query runner for transaction support
   */
  private async getAvailablePort(queryRunner?: any): Promise<number | null> {
    const minPort = 11000;
    const maxPort = 15000;
    
    try {
      const repository = queryRunner?.manager?.getRepository(RotatingProxyPurchase) || this.rotatingProxyRepository;
      
      // Find all used ports - handle case where port column might not exist yet
      let usedPorts: any[] = [];
      try {
        usedPorts = await repository
          .createQueryBuilder('purchase')
          .select('purchase.port', 'port')
          .where('purchase.port IS NOT NULL')
          .andWhere('purchase.port >= :minPort', { minPort })
          .andWhere('purchase.port <= :maxPort', { maxPort })
          .getRawMany();
      } catch (error: any) {
        // If column doesn't exist, assume no ports are used yet
        if (error.message && error.message.includes('port')) {
          this.logger.warn('Port column query failed, assuming no ports are used yet');
          usedPorts = [];
        } else {
          throw error;
        }
      }

      const usedPortSet = new Set(usedPorts.map((p: any) => p.port));
      
      // Find first available port
      for (let port = minPort; port <= maxPort; port++) {
        if (!usedPortSet.has(port)) {
          this.logger.log(`Found available port: ${port}`);
          return port;
        }
      }
      
      this.logger.warn('No available port in range 11000-15000');
      return null; // No available port
    } catch (error: any) {
      this.logger.error(`Error getting available port: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get rotating proxy domain from config
   */
  private getDomain(): string {
    return (
      this.configService.get<string>('ROTATING_PROXY_DOMAIN') ||
      'proxy.yourdomain.com'
    );
  }

  /**
   * Calculate price for rotating proxy purchase
   * Price: 4,000 VNĐ per proxy per day
   */
  calculatePrice(proxyCount: number, duration: PurchaseDuration): number {
    if (proxyCount < 1 || proxyCount > 100) {
      throw new BadRequestException('Proxy count must be between 1 and 100');
    }

    const days = this.getDaysFromDuration(duration);
    return proxyCount * 4000 * days;
  }

  /**
   * Get number of days from duration enum
   */
  private getDaysFromDuration(duration: PurchaseDuration): number {
    switch (duration) {
      case PurchaseDuration.DAYS_1:
        return 1;
      case PurchaseDuration.DAYS_3:
        return 3;
      case PurchaseDuration.DAYS_7:
        return 7;
      case PurchaseDuration.DAYS_15:
        return 15;
      case PurchaseDuration.HOURS_24:
        return 1;
      case PurchaseDuration.DAYS_30:
        return 30;
      default:
        return 1;
    }
  }

  /**
   * Calculate expiration date from duration
   */
  private calculateExpirationDate(duration: PurchaseDuration): Date {
    const now = new Date();
    const days = this.getDaysFromDuration(duration);
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Create rotating proxy purchases from payment order
   */
  async createRotatingProxyPurchase(
    userId: string,
    orderId: string,
    createDto: CreateRotatingProxyPurchaseDto,
  ): Promise<RotatingProxyResponse[]> {
    this.logger.log(
      `Creating rotating proxy purchase: userId=${userId}, orderId=${orderId}, proxyCount=${createDto.proxyCount}, duration=${createDto.duration}`,
    );

    // Validate proxy count
    if (createDto.proxyCount < 1 || createDto.proxyCount > 100) {
      throw new BadRequestException('Proxy count must be between 1 and 100');
    }

    // Validate duration
    if (!Object.values(PurchaseDuration).includes(createDto.duration)) {
      throw new BadRequestException('Invalid duration');
    }

    // Verify payment order exists and is paid
    const paymentOrder = await this.paymentOrderRepository.findOne({
      where: { id: orderId, userId },
    });

    if (!paymentOrder) {
      this.logger.error(`Payment order not found: orderId=${orderId}, userId=${userId}`);
      throw new NotFoundException('Payment order not found');
    }

    this.logger.log(
      `Payment order found: orderCode=${paymentOrder.orderCode}, status=${paymentOrder.status}`,
    );

    if (paymentOrder.status !== PaymentOrderStatus.PAID) {
      this.logger.warn(
        `Payment order is not paid: orderCode=${paymentOrder.orderCode}, status=${paymentOrder.status}`,
      );
      throw new BadRequestException('Payment order is not paid');
    }

    // Check if purchases already exist for this order (idempotent)
    const existingPurchases = await this.rotatingProxyRepository.find({
      where: { orderId },
    });

    if (existingPurchases.length > 0) {
      this.logger.log(
        `Purchases already exist for order ${orderId}, returning existing purchases`,
      );
      return existingPurchases.map((p) => ({
        id: p.id,
        domain: p.domain,
        ip: '', // Will be set by client based on public IP
        port: p.port,
        mappingId: (p as any).mappingId || null,
        rotationInterval: (p as any).rotationInterval || 5,
        expiresAt: p.expiresAt,
        duration: p.duration,
        status: p.status,
      }));
    }

    const domain = this.getDomain();
    const expiresAt = this.calculateExpirationDate(createDto.duration);
    const pricePerProxy = this.calculatePrice(1, createDto.duration);

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const purchases: RotatingProxyPurchase[] = [];

      // Create purchases without API keys (using IP:port instead)
      for (let i = 0; i < createDto.proxyCount; i++) {
        // Get available port for this proxy
        const port = await this.getAvailablePort(queryRunner);
        if (!port) {
          throw new Error('No available port in range 11000-15000');
        }

        const purchase = queryRunner.manager.create(RotatingProxyPurchase, {
          userId,
          orderId,
          domain,
          apiKey: null, // No longer using API key
          port,
          mappingId: null, // Can be set later if needed
          rotationInterval: 5, // Default 5 minutes
          expiresAt,
          duration: createDto.duration,
          price: pricePerProxy,
          status: PurchaseStatus.ACTIVE,
        });

        const savedPurchase = await queryRunner.manager.save(purchase);
        purchases.push(savedPurchase);
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Created ${purchases.length} rotating proxy purchases for order ${orderId}`,
      );

      return purchases.map((p) => ({
        id: p.id,
        domain: p.domain,
        ip: '', // Will be set by client based on public IP
        port: p.port,
        mappingId: (p as any).mappingId || null,
        rotationInterval: (p as any).rotationInterval || 5,
        expiresAt: p.expiresAt,
        duration: p.duration,
        status: p.status,
      }));
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create rotating proxy purchases: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all rotating proxy purchases for a user
   */
  async getMyRotatingProxies(userId: string): Promise<RotatingProxyResponse[]> {
    // Use query builder to explicitly select columns and handle port column gracefully
    const purchases = await this.rotatingProxyRepository
      .createQueryBuilder('purchase')
      .where('purchase.userId = :userId', { userId })
      .orderBy('purchase.createdAt', 'DESC')
      .getMany();

    return purchases.map((p) => ({
      id: p.id,
      domain: p.domain,
      ip: '', // Will be set by client based on public IP
      port: (p as any).port || null, // Handle port column gracefully
      mappingId: (p as any).mappingId || null,
      rotationInterval: (p as any).rotationInterval || 5,
      expiresAt: p.expiresAt,
      duration: p.duration,
      status: p.status,
    }));
  }

  /**
   * Get rotating proxy purchase by ID
   */
  async getRotatingProxyById(
    id: string,
    userId: string,
  ): Promise<RotatingProxyResponse> {
    const purchase = await this.rotatingProxyRepository.findOne({
      where: { id, userId },
    });

    if (!purchase) {
      throw new NotFoundException('Rotating proxy purchase not found');
    }

    return {
      id: purchase.id,
      domain: purchase.domain,
      ip: '', // Will be set by client based on public IP
      port: purchase.port,
      mappingId: (purchase as any).mappingId || null,
      rotationInterval: (purchase as any).rotationInterval || 5,
      expiresAt: purchase.expiresAt,
      duration: purchase.duration,
      status: purchase.status,
    };
  }

  /**
   * Update rotation interval for a rotating proxy purchase
   */
  async updateRotationInterval(
    id: string,
    userId: string,
    rotationInterval: number,
  ): Promise<RotatingProxyResponse> {
    // Validate rotation interval (1, 2, or 5 minutes)
    if (![1, 2, 5].includes(rotationInterval)) {
      throw new BadRequestException('Rotation interval must be 1, 2, or 5 minutes');
    }

    const purchase = await this.rotatingProxyRepository.findOne({
      where: { id, userId },
    });

    if (!purchase) {
      throw new NotFoundException('Rotating proxy purchase not found');
    }

    (purchase as any).rotationInterval = rotationInterval;
    await this.rotatingProxyRepository.save(purchase);

    return {
      id: purchase.id,
      domain: purchase.domain,
      ip: '', // Will be set by client based on public IP
      port: purchase.port,
      mappingId: (purchase as any).mappingId || null,
      rotationInterval: rotationInterval,
      expiresAt: purchase.expiresAt,
      duration: purchase.duration,
      status: purchase.status,
    };
  }

  /**
   * Update port for a rotating proxy purchase
   */
  async updatePort(
    id: string,
    userId: string,
    port: number,
  ): Promise<RotatingProxyResponse> {
    // Validate port range
    if (port < 11000 || port > 15000) {
      throw new BadRequestException('Port must be between 11000 and 15000');
    }

    const purchase = await this.rotatingProxyRepository.findOne({
      where: { id, userId },
    });

    if (!purchase) {
      throw new NotFoundException('Rotating proxy purchase not found');
    }

    // Check if port is already used by another purchase
    const existingPurchase = await this.rotatingProxyRepository.findOne({
      where: { port },
    });

    if (existingPurchase && existingPurchase.id !== id) {
      throw new BadRequestException('Port is already in use');
    }

    purchase.port = port;
    await this.rotatingProxyRepository.save(purchase);

    return {
      id: purchase.id,
      domain: purchase.domain,
      ip: '', // Will be set by client based on public IP
      port: purchase.port,
      mappingId: (purchase as any).mappingId || null,
      rotationInterval: (purchase as any).rotationInterval || 5,
      expiresAt: purchase.expiresAt,
      duration: purchase.duration,
      status: purchase.status,
    };
  }

  /**
   * Expire rotating proxy purchases that have passed expiration date
   */
  async expireExpiredPurchases(): Promise<void> {
    const now = new Date();

    const expiredPurchases = await this.rotatingProxyRepository
      .createQueryBuilder('purchase')
      .where('purchase.status = :status', { status: PurchaseStatus.ACTIVE })
      .andWhere('purchase.expires_at < :now', { now })
      .getMany();

    if (expiredPurchases.length === 0) {
      return;
    }

    this.logger.log(
      `Found ${expiredPurchases.length} expired rotating proxy purchases to process`,
    );

    for (const purchase of expiredPurchases) {
      purchase.status = PurchaseStatus.EXPIRED;
      await this.rotatingProxyRepository.save(purchase);
      this.logger.log(`Expired rotating proxy purchase: ${purchase.id}`);
    }
  }
}
