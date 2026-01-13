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
import { Gateway } from '../gateways/gateways.entity';
import { GatewayPort } from '../gateway-ports/gateway-ports.entity';
import { Socks5Upstream } from '../socks5-upstream/socks5-upstream.entity';
import { User } from '../users/users.entity';

export enum PortMappingStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  RELEASED = 'released',
}

@Entity('port_mappings')
@Index(['gatewayId', 'port'], { unique: true })
@Index(['userId', 'status'])
export class PortMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'gateway_id', type: 'uuid' })
  gatewayId: string;

  @ManyToOne(() => Gateway)
  @JoinColumn({ name: 'gateway_id' })
  gateway: Gateway;

  @Column({ name: 'port_id', type: 'uuid', nullable: true })
  portId: string | null;

  @ManyToOne(() => GatewayPort, { nullable: true })
  @JoinColumn({ name: 'port_id' })
  gatewayPort: GatewayPort | null;

  @Column({ type: 'int' })
  port: number;

  @Column({ name: 'upstream_id', type: 'uuid' })
  upstreamId: string;

  @ManyToOne(() => Socks5Upstream)
  @JoinColumn({ name: 'upstream_id' })
  upstream: Socks5Upstream;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'assigned_at', type: 'timestamp' })
  assignedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({
    type: 'enum',
    enum: PortMappingStatus,
    default: PortMappingStatus.ACTIVE,
  })
  status: PortMappingStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

