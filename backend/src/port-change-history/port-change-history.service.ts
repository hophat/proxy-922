import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { PortChangeHistory, PortChangeType } from './port-change-history.entity';

@Injectable()
export class PortChangeHistoryService {
  private readonly logger = new Logger(PortChangeHistoryService.name);
  private readonly COOLDOWN_MINUTES = 5;

  constructor(
    @InjectRepository(PortChangeHistory)
    private portChangeHistoryRepository: Repository<PortChangeHistory>,
  ) {}

  /**
   * Kiểm tra xem user có thể đổi port cho gateway này không
   * Phải cách lần đổi cuối ít nhất 5 phút
   */
  async checkCooldown(userId: string, gatewayId: string): Promise<{
    canChange: boolean;
    lastChangeTime: Date | null;
    cooldownEndTime: Date | null;
    remainingMinutes: number;
  }> {
    // Tìm lần thay đổi port cuối cùng của user cho gateway này
    const lastChange = await this.portChangeHistoryRepository.findOne({
      where: {
        userId,
        gatewayId,
      },
      order: {
        changedAt: 'DESC',
      },
    });

    if (!lastChange) {
      // Chưa có lần thay đổi nào, có thể đổi
      return {
        canChange: true,
        lastChangeTime: null,
        cooldownEndTime: null,
        remainingMinutes: 0,
      };
    }

    const now = new Date();
    const lastChangeTime = new Date(lastChange.changedAt);
    const cooldownEndTime = new Date(lastChangeTime);
    cooldownEndTime.setMinutes(cooldownEndTime.getMinutes() + this.COOLDOWN_MINUTES);

    const remainingMinutes = Math.max(
      0,
      Math.ceil((cooldownEndTime.getTime() - now.getTime()) / (1000 * 60)),
    );

    const canChange = now >= cooldownEndTime;

    return {
      canChange,
      lastChangeTime,
      cooldownEndTime,
      remainingMinutes,
    };
  }

  /**
   * Ghi lại lịch sử thay đổi port
   */
  async recordPortChange(data: {
    userId: string;
    gatewayId: string;
    portMappingId?: string | null;
    oldPort?: number | null;
    newPort?: number | null;
    oldGatewayId?: string | null;
    newGatewayId?: string | null;
    changeType: PortChangeType;
  }): Promise<PortChangeHistory> {
    const history = this.portChangeHistoryRepository.create({
      userId: data.userId,
      gatewayId: data.gatewayId,
      portMappingId: data.portMappingId || null,
      oldPort: data.oldPort || null,
      newPort: data.newPort || null,
      oldGatewayId: data.oldGatewayId || null,
      newGatewayId: data.newGatewayId || null,
      changeType: data.changeType,
      changedAt: new Date(),
    });

    return this.portChangeHistoryRepository.save(history);
  }

  /**
   * Lấy thời gian đổi port cuối cùng
   */
  async getLastChangeTime(userId: string, gatewayId: string): Promise<Date | null> {
    const lastChange = await this.portChangeHistoryRepository.findOne({
      where: {
        userId,
        gatewayId,
      },
      order: {
        changedAt: 'DESC',
      },
    });

    return lastChange ? lastChange.changedAt : null;
  }

  /**
   * Validate cooldown và throw exception nếu chưa hết cooldown
   * ĐÃ BỎ COOLDOWN - Không áp dụng chặn 5 phút nữa
   */
  async validateCooldown(
    userId: string, 
    gatewayId: string, 
    mappingId?: string | null,
    portMappingRepository?: any, // Repository<PortMapping>
  ): Promise<void> {
    // Bỏ cooldown - luôn cho phép đổi port
    this.logger.log(`[Cooldown] Cooldown disabled - allowing port change for mapping ${mappingId}`);
    return;
  }
}
