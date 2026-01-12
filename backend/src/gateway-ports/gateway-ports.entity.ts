import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Gateway } from '../gateways/gateways.entity';

export enum GatewayPortStatus {
  AVAILABLE = 'available',
  ASSIGNED = 'assigned',
  RESERVED = 'reserved',
}

@Entity('gateway_ports')
export class GatewayPort {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'gateway_id', type: 'uuid' })
  gatewayId: string;

  @ManyToOne(() => Gateway)
  @JoinColumn({ name: 'gateway_id' })
  gateway: Gateway;

  @Column({ type: 'int' })
  port: number;

  @Column({
    type: 'enum',
    enum: GatewayPortStatus,
    default: GatewayPortStatus.AVAILABLE,
  })
  status: GatewayPortStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

