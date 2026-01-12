import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProxyStatus {
  ACTIVE = 'active',
  DEAD = 'dead',
  DISABLED = 'disabled',
}

@Entity('socks5_proxies')
export class Socks5Proxy {
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

  @Column({
    type: 'enum',
    enum: ProxyStatus,
    default: ProxyStatus.ACTIVE,
  })
  status: ProxyStatus;

  @Column({ name: 'last_check', type: 'timestamp', nullable: true })
  lastCheck: Date;

  @Column({ name: 'consecutive_failures', type: 'int', default: 0 })
  consecutiveFailures: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

