import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/users.entity';
import { Gateway } from '../gateways/gateways.entity';
import { PortMapping } from '../port-mappings/port-mappings.entity';

export enum PortChangeType {
  PORT_CHANGE = 'port_change',
  GATEWAY_CHANGE = 'gateway_change',
}

@Entity('port_change_history')
@Index(['userId', 'gatewayId', 'changedAt'])
@Index(['portMappingId'])
export class PortChangeHistory {
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

  @Column({ name: 'port_mapping_id', type: 'uuid', nullable: true })
  portMappingId: string | null;

  @ManyToOne(() => PortMapping, { nullable: true })
  @JoinColumn({ name: 'port_mapping_id' })
  portMapping: PortMapping | null;

  @Column({ name: 'old_port', type: 'int', nullable: true })
  oldPort: number | null;

  @Column({ name: 'new_port', type: 'int', nullable: true })
  newPort: number | null;

  @Column({ name: 'old_gateway_id', type: 'uuid', nullable: true })
  oldGatewayId: string | null;

  @ManyToOne(() => Gateway, { nullable: true })
  @JoinColumn({ name: 'old_gateway_id' })
  oldGateway: Gateway | null;

  @Column({ name: 'new_gateway_id', type: 'uuid', nullable: true })
  newGatewayId: string | null;

  @ManyToOne(() => Gateway, { nullable: true })
  @JoinColumn({ name: 'new_gateway_id' })
  newGateway: Gateway | null;

  @Column({
    name: 'change_type',
    type: 'enum',
    enum: PortChangeType,
  })
  changeType: PortChangeType;

  @Column({ name: 'changed_at', type: 'timestamp' })
  changedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
