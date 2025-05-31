import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  SHIFT_ASSIGNED = 'shift_assigned',
  SHIFT_REMOVED = 'shift_removed',
  SHIFT_UPDATED = 'shift_updated',
  SHIFT_SWAP_REQUESTED = 'shift_swap_requested',
  SHIFT_SWAP_ACCEPTED = 'shift_swap_accepted',
  SHIFT_SWAP_REJECTED = 'shift_swap_rejected',
  SYSTEM = 'system',
  PASSWORD_RESET = 'password_reset',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: NotificationChannel, default: NotificationChannel.IN_APP })
  channel: NotificationChannel;

  @Column({ default: false })
  read: boolean;

  @Column({ nullable: true, type: 'jsonb' })
  metadata: Record<string, any>;

  @Column({ name: 'recipient_id' })
  recipientId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ name: 'organization_id' })
  organizationId: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ nullable: true, name: 'sent_at', type: 'timestamp with time zone' })
  sentAt: Date;
}
