import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/users.entity';
import { Gateway } from '../gateways/gateways.entity';
import { GatewayPort } from '../gateway-ports/gateway-ports.entity';
import { PortMapping } from '../port-mappings/port-mappings.entity';

export enum PurchaseDuration {
  HOURS_24 = '24h',
  DAYS_1 = '1d',
  DAYS_3 = '3d',
  DAYS_7 = '7d',
  DAYS_15 = '15d',
  DAYS_30 = '30d',
}

export enum PurchaseStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('user_proxy_purchases')
@Index(['userId', 'status'])
@Index(['expiresAt'])
export class UserProxyPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'gateway_id', type: 'uuid' })
  gatewayId: string;

  @ManyToOne(() => Gateway)
  @JoinColumn({ name: 'gateway_id' })
  gateway: Gateway;

  @Column({ name: 'port_id', type: 'uuid', nullable: true })
  portId: string | null;

  @ManyToOne(() => GatewayPort, { nullable: true })
  @JoinColumn({ name: 'port_id' })
  port: GatewayPort | null;

  @Column({ name: 'mapping_id', type: 'uuid' })
  mappingId: string;

  @ManyToOne(() => PortMapping)
  @JoinColumn({ name: 'mapping_id' })
  mapping: PortMapping;

  @Column({ name: 'purchased_at', type: 'timestamp' })
  purchasedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({
    type: 'enum',
    enum: PurchaseDuration,
  })
  duration: PurchaseDuration;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: PurchaseStatus,
    default: PurchaseStatus.ACTIVE,
  })
  status: PurchaseStatus;

  @Column({ name: 'gateway_username' })
  gatewayUsername: string;

  @Column({ name: 'gateway_password' })
  gatewayPassword: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

