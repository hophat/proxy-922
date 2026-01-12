import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Socks5Upstream, UpstreamStatus } from './socks5-upstream.entity';
import { PortMapping, PortMappingStatus } from '../port-mappings/port-mappings.entity';
import { GeoLocationService, GeoInfo } from '../geo-location/geo-location.service';
import * as crypto from 'crypto';

export interface CreateUpstreamDto {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

@Injectable()
export class Socks5UpstreamService {
  constructor(
    @InjectRepository(Socks5Upstream)
    private upstreamRepository: Repository<Socks5Upstream>,
    @InjectRepository(PortMapping)
    private portMappingRepository: Repository<PortMapping>,
    private geoLocationService: GeoLocationService,
  ) {}

  private encryptPassword(password: string): string {
    const algorithm = 'aes-256-cbc';
    let keyString = process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!';

    if (keyString.length < 32) {
      keyString = keyString.padEnd(32, '!');
    } else if (keyString.length > 32) {
      keyString = keyString.substring(0, 32);
    }

    const key = Buffer.from(keyString, 'utf8');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptPassword(encrypted: string): string {
    const algorithm = 'aes-256-cbc';
    let keyString = process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!';

    if (keyString.length < 32) {
      keyString = keyString.padEnd(32, '!');
    } else if (keyString.length > 32) {
      keyString = keyString.substring(0, 32);
    }

    const key = Buffer.from(keyString, 'utf8');
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  maskIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    return ip;
  }

  async create(createDto: CreateUpstreamDto): Promise<Socks5Upstream> {
    const upstream = this.upstreamRepository.create({
      host: createDto.host,
      port: createDto.port,
      username: createDto.username || null,
      passwordEncrypted: createDto.password
        ? this.encryptPassword(createDto.password)
        : null,
      status: UpstreamStatus.AVAILABLE,
      consecutiveFailures: 0,
    });

    const saved = await this.upstreamRepository.save(upstream);

    // Fetch geo info asynchronously
    this.updateGeoInfo(saved.id).catch((err) => {
      console.error(`Failed to update geo info for upstream ${saved.id}:`, err);
    });

    return saved;
  }

  async findAll(): Promise<Socks5Upstream[]> {
    return this.upstreamRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAvailable(): Promise<Socks5Upstream[]> {
    return this.upstreamRepository.find({
      where: { status: UpstreamStatus.AVAILABLE },
      order: { ping: 'ASC' },
    });
  }

  async findActive(): Promise<Socks5Upstream[]> {
    // Tương tự findAvailable, nhưng có thể sort theo lastCheck
    return this.upstreamRepository.find({
      where: { status: UpstreamStatus.AVAILABLE },
      order: { lastCheck: 'ASC', ping: 'ASC' },
    });
  }

  async findById(id: string): Promise<Socks5Upstream> {
    const upstream = await this.upstreamRepository.findOne({ where: { id } });
    if (!upstream) {
      throw new NotFoundException(`Upstream with ID ${id} not found`);
    }
    return upstream;
  }

  async updateGeoInfo(id: string): Promise<void> {
    const upstream = await this.findById(id);
    const geoInfo = await this.geoLocationService.getGeoInfo(upstream.host);

    if (geoInfo) {
      upstream.country = geoInfo.country;
      upstream.state = geoInfo.regionName;
      upstream.city = geoInfo.city;
      upstream.zip = geoInfo.zip;
      upstream.isp = geoInfo.isp;
      await this.upstreamRepository.save(upstream);
    }
  }

  async updateAllGeoInfo(): Promise<{ updated: number; failed: number; total: number }> {
    const upstreams = await this.upstreamRepository.find();
    let updated = 0;
    let failed = 0;

    for (const upstream of upstreams) {
      try {
        await this.updateGeoInfo(upstream.id);
        updated++;
        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to update geo info for upstream ${upstream.id}:`, error);
        failed++;
      }
    }

    return {
      updated,
      failed,
      total: upstreams.length,
    };
  }

  async updatePing(id: string, ping: number): Promise<void> {
    const upstream = await this.findById(id);
    upstream.ping = ping;
    await this.upstreamRepository.save(upstream);
  }

  async updateStatus(id: string, status: UpstreamStatus): Promise<Socks5Upstream> {
    const upstream = await this.findById(id);
    upstream.status = status;
    if (status === UpstreamStatus.AVAILABLE) {
      upstream.consecutiveFailures = 0;
    }
    return this.upstreamRepository.save(upstream);
  }

  async update(id: string, updateDto: Partial<CreateUpstreamDto>): Promise<Socks5Upstream> {
    const upstream = await this.findById(id);
    if (updateDto.host) upstream.host = updateDto.host;
    if (updateDto.port) upstream.port = updateDto.port;
    if (updateDto.username !== undefined) upstream.username = updateDto.username || null;
    if (updateDto.password !== undefined) {
      upstream.passwordEncrypted = updateDto.password
        ? this.encryptPassword(updateDto.password)
        : null;
    }
    return this.upstreamRepository.save(upstream);
  }

  async delete(id: string): Promise<void> {
    const upstream = await this.findById(id);
    await this.upstreamRepository.remove(upstream);
  }

  async importFromFile(content: string): Promise<{ imported: number; errors: string[] }> {
    const lines = content.split('\n').filter((line) => line.trim());
    const errors: string[] = [];
    let imported = 0;

    for (const line of lines) {
      try {
        const proxy = this.parseProxyLine(line.trim());
        if (proxy) {
          await this.create(proxy);
          imported++;
        }
      } catch (error: any) {
        errors.push(`Line "${line}": ${error.message}`);
      }
    }

    return { imported, errors };
  }

  private parseProxyLine(line: string): CreateUpstreamDto | null {
    // Format: IP:PORT:USER:PASS or IP:PORT
    const parts = line.split(':');
    if (parts.length < 2) {
      throw new Error('Invalid format');
    }

    const host = parts[0];
    const port = parseInt(parts[1], 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error('Invalid port');
    }

    const username = parts[2] || undefined;
    const password = parts[3] || undefined;

    return { host, port, username, password };
  }

  async updateHealthStatus(
    id: string,
    isAlive: boolean,
    lastCheck: Date,
  ): Promise<void> {
    const upstream = await this.findById(id);
    upstream.lastCheck = lastCheck;

    if (isAlive) {
      upstream.status = UpstreamStatus.AVAILABLE;
      upstream.consecutiveFailures = 0;
    } else {
      upstream.consecutiveFailures += 1;
      if (upstream.consecutiveFailures >= 3) {
        upstream.status = UpstreamStatus.MAINTENANCE;
      } else {
        upstream.status = UpstreamStatus.UNAVAILABLE;
      }
    }

    await this.upstreamRepository.save(upstream);
  }

  // Alias for getUpstreamCredentials để tương thích với ProxiesService
  async getProxyCredentials(upstream: Socks5Upstream): Promise<{
    host: string;
    port: number;
    username?: string;
    password?: string;
  }> {
    return this.getUpstreamCredentials(upstream);
  }

  async getUpstreamCredentials(upstream: Socks5Upstream): Promise<{
    host: string;
    port: number;
    username?: string;
    password?: string;
  }> {
    return {
      host: upstream.host,
      port: upstream.port,
      username: upstream.username || undefined,
      password: upstream.passwordEncrypted
        ? this.decryptPassword(upstream.passwordEncrypted)
        : undefined,
    };
  }

  async findAvailableForRent(): Promise<Socks5Upstream[]> {
    // Tìm các upstreams có status AVAILABLE và chưa có active port mapping (chưa expire)
    const now = new Date();
    const activeMappings = await this.portMappingRepository
      .createQueryBuilder('pm')
      .select('DISTINCT pm.upstreamId', 'upstreamId')
      .where('pm.status = :status', { status: PortMappingStatus.ACTIVE })
      .andWhere('pm.expiresAt > :now', { now })
      .getRawMany();

    const rentedUpstreamIds = activeMappings
      .map((m) => m.upstreamId)
      .filter((id) => id !== null && id !== undefined);

    if (rentedUpstreamIds.length === 0) {
      // Nếu không có upstream nào đang được thuê, trả về tất cả available
      return this.upstreamRepository.find({
        where: { status: UpstreamStatus.AVAILABLE },
        order: { ping: 'ASC' },
      });
    }

    return this.upstreamRepository.find({
      where: {
        status: UpstreamStatus.AVAILABLE,
        id: Not(In(rentedUpstreamIds)),
      },
      order: { ping: 'ASC' },
    });
  }

  async isUpstreamRented(upstreamId: string): Promise<boolean> {
    const activeMapping = await this.portMappingRepository.findOne({
      where: {
        upstreamId,
        status: PortMappingStatus.ACTIVE,
      },
    });

    if (!activeMapping) {
      return false;
    }

    // Check xem mapping có còn hiệu lực không (chưa expire)
    const now = new Date();
    return activeMapping.expiresAt > now;
  }
}

