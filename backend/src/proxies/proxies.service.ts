import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Socks5Proxy, ProxyStatus } from './proxies.entity';
import * as crypto from 'crypto';

export interface CreateProxyDto {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface ImportProxyLine {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

@Injectable()
export class ProxiesService {
  constructor(
    @InjectRepository(Socks5Proxy)
    private proxiesRepository: Repository<Socks5Proxy>,
  ) {}

  private encryptPassword(password: string): string {
    // Simple encryption for MVP - in production use proper encryption
    const algorithm = 'aes-256-cbc';
    let keyString = process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!';
    
    // Ensure key is exactly 32 bytes for AES-256
    if (keyString.length < 32) {
      // Pad with default string
      keyString = keyString.padEnd(32, '!');
    } else if (keyString.length > 32) {
      // Truncate to 32 bytes
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
    
    // Ensure key is exactly 32 bytes for AES-256
    if (keyString.length < 32) {
      // Pad with default string
      keyString = keyString.padEnd(32, '!');
    } else if (keyString.length > 32) {
      // Truncate to 32 bytes
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

  async findAll(): Promise<Socks5Proxy[]> {
    return this.proxiesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Socks5Proxy> {
    const proxy = await this.proxiesRepository.findOne({ where: { id } });
    if (!proxy) {
      throw new NotFoundException(`Proxy with ID ${id} not found`);
    }
    return proxy;
  }

  async findActive(): Promise<Socks5Proxy[]> {
    return this.proxiesRepository.find({
      where: { status: ProxyStatus.ACTIVE },
      order: { lastCheck: 'ASC' },
    });
  }

  async create(createDto: CreateProxyDto): Promise<Socks5Proxy> {
    const proxy = this.proxiesRepository.create({
      host: createDto.host,
      port: createDto.port,
      username: createDto.username || null,
      passwordEncrypted: createDto.password
        ? this.encryptPassword(createDto.password)
        : null,
      status: ProxyStatus.ACTIVE,
      consecutiveFailures: 0,
    });
    return this.proxiesRepository.save(proxy);
  }

  async update(id: string, updateDto: Partial<CreateProxyDto>): Promise<Socks5Proxy> {
    const proxy = await this.findById(id);
    if (updateDto.host) proxy.host = updateDto.host;
    if (updateDto.port) proxy.port = updateDto.port;
    if (updateDto.username !== undefined) proxy.username = updateDto.username || null;
    if (updateDto.password !== undefined) {
      proxy.passwordEncrypted = updateDto.password
        ? this.encryptPassword(updateDto.password)
        : null;
    }
    return this.proxiesRepository.save(proxy);
  }

  async updateStatus(id: string, status: ProxyStatus): Promise<Socks5Proxy> {
    const proxy = await this.findById(id);
    proxy.status = status;
    if (status === ProxyStatus.ACTIVE) {
      proxy.consecutiveFailures = 0;
    }
    return this.proxiesRepository.save(proxy);
  }

  async delete(id: string): Promise<void> {
    const proxy = await this.findById(id);
    await this.proxiesRepository.remove(proxy);
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
      } catch (error) {
        errors.push(`Line "${line}": ${error.message}`);
      }
    }

    return { imported, errors };
  }

  private parseProxyLine(line: string): ImportProxyLine | null {
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
    const proxy = await this.findById(id);
    proxy.lastCheck = lastCheck;

    if (isAlive) {
      proxy.status = ProxyStatus.ACTIVE;
      proxy.consecutiveFailures = 0;
    } else {
      proxy.consecutiveFailures += 1;
      if (proxy.consecutiveFailures >= 3) {
        proxy.status = ProxyStatus.DISABLED;
      } else {
        proxy.status = ProxyStatus.DEAD;
      }
    }

    await this.proxiesRepository.save(proxy);
  }

  async getProxyCredentials(proxy: Socks5Proxy): Promise<{
    host: string;
    port: number;
    username?: string;
    password?: string;
  }> {
    return {
      host: proxy.host,
      port: proxy.port,
      username: proxy.username || undefined,
      password: proxy.passwordEncrypted ? this.decryptPassword(proxy.passwordEncrypted) : undefined,
    };
  }
}

