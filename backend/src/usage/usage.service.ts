import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

export interface UsageDto {
  userId: string;
  bytes: number;
}

@Injectable()
export class UsageService {
  constructor(private usersService: UsersService) {}

  async logUsage(usageDto: UsageDto): Promise<{ success: boolean; quotaExceeded?: boolean }> {
    const user = await this.usersService.findById(usageDto.userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if quota would be exceeded
    const newQuotaUsed = user.quotaUsed + usageDto.bytes;
    const quotaExceeded = newQuotaUsed > user.quotaTotal;

    if (!quotaExceeded) {
      // Update quota used
      await this.usersService.updateQuotaUsed(usageDto.userId, usageDto.bytes);
    }

    return {
      success: !quotaExceeded,
      quotaExceeded,
    };
  }

  async checkQuota(userId: string): Promise<{
    total: number;
    used: number;
    remaining: number;
    hasQuota: boolean;
  }> {
    const quota = await this.usersService.getQuota(userId);
    return {
      ...quota,
      hasQuota: quota.remaining > 0,
    };
  }
}

