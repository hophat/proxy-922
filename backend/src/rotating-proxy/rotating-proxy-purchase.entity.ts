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
import { PaymentOrder } from '../payments/payment-order.entity';
import { PurchaseDuration, PurchaseStatus } from '../purchases/user-proxy-purchase.entity';

@Entity('rotating_proxy_purchases')
@Index(['userId', 'status'])
@Index(['expiresAt'])
// @Index(['apiKey'], { unique: true }) // Removed - API key is deprecated
@Index(['orderId'])
export class RotatingProxyPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => PaymentOrder)
  @JoinColumn({ name: 'order_id' })
  order: PaymentOrder;

  @Column({ type: 'varchar', length: 255 })
  domain: string;

  @Column({ name: 'api_key', type: 'varchar', length: 64, nullable: true })
  apiKey: string | null; // Deprecated - no longer used

  @Column({ name: 'port', type: 'integer', nullable: true })
  port: number | null;

  @Column({ name: 'mapping_id', type: 'uuid', nullable: true })
  mappingId: string | null;

  @Column({ name: 'rotation_interval', type: 'integer', nullable: true, default: 5 })
  rotationInterval: number | null; // Minutes: 1, 2, 5

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
