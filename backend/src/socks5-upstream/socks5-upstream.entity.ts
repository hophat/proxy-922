import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UpstreamStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  MAINTENANCE = 'maintenance',
  IN_USE = 'in_use',
}

@Entity('socks5_upstreams')
export class Socks5Upstream {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  host: string;

  @Column({ type: 'int' })
  port: number;

  @Column({ nullable: true })
  username: string;

  @Column({ name: 'password_encrypted', nullable: true })
  passwordEncrypted: string;

  @Column({ type: 'int', nullable: true })
  ping: number;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  zip: string;

  @Column({ nullable: true })
  isp: string;

  @Column({ nullable: true })
  country: string;

  @Column({
    type: 'enum',
    enum: UpstreamStatus,
    default: UpstreamStatus.AVAILABLE,
  })
  status: UpstreamStatus;

  @Column({ name: 'last_check', type: 'timestamp', nullable: true })
  lastCheck: Date;

  @Column({ name: 'consecutive_failures', type: 'int', default: 0 })
  consecutiveFailures: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

