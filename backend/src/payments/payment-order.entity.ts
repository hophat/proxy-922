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

export enum PaymentOrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum PurchaseType {
  UPSTREAM = 'upstream',
  PORT = 'port',
}

@Entity('payment_orders')
@Index(['orderCode'], { unique: true })
@Index(['userId', 'status'])
@Index(['expiredAt'])
export class PaymentOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sepay_order_id', nullable: true })
  sepayOrderId: string | null;

  @Column({ name: 'order_code', unique: true })
  orderCode: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentOrderStatus,
    default: PaymentOrderStatus.PENDING,
  })
  status: PaymentOrderStatus;

  @Column({
    name: 'purchase_type',
    type: 'enum',
    enum: PurchaseType,
  })
  purchaseType: PurchaseType;

  @Column({ name: 'purchase_data', type: 'jsonb' })
  purchaseData: Record<string, any>;

  @Column({ name: 'va_number', nullable: true })
  vaNumber: string | null;

  @Column({ name: 'qr_code_url', nullable: true, type: 'text' })
  qrCodeUrl: string | null;

  @Column({ name: 'expired_at', type: 'timestamp' })
  expiredAt: Date;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'sepay_transaction_id', nullable: true })
  sepayTransactionId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
