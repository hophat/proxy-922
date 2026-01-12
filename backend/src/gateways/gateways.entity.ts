import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum GatewayStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  DISABLED = 'disabled',
}

@Entity('gateways')
export class Gateway {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ip: string;

  @Column({ name: 'port_range_start', type: 'int' })
  portRangeStart: number;

  @Column({ name: 'port_range_end', type: 'int' })
  portRangeEnd: number;

  @Column({
    type: 'enum',
    enum: GatewayStatus,
    default: GatewayStatus.ACTIVE,
  })
  status: GatewayStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

