import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(email: string, passwordHash: string): Promise<User> {
    const user = this.usersRepository.create({
      email,
      passwordHash,
      quotaTotal: 0,
      quotaUsed: 0,
      active: true,
    });
    return this.usersRepository.save(user);
  }

  async updateQuotaUsed(userId: string, bytes: number): Promise<void> {
    await this.usersRepository.increment({ id: userId }, 'quotaUsed', bytes);
  }

  async getQuota(userId: string): Promise<{ total: number; used: number; remaining: number }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      total: user.quotaTotal,
      used: user.quotaUsed,
      remaining: Math.max(0, user.quotaTotal - user.quotaUsed),
    };
  }

  async updateQuotaTotal(userId: string, quotaTotal: number): Promise<void> {
    await this.usersRepository.update({ id: userId }, { quotaTotal });
  }

  async updateActive(userId: string, active: boolean): Promise<void> {
    await this.usersRepository.update({ id: userId }, { active });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async resetQuotaUsed(userId: string): Promise<void> {
    await this.usersRepository.update({ id: userId }, { quotaUsed: 0 });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update({ id: userId }, { passwordHash });
  }
}

