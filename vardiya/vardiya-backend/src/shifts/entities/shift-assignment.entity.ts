import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Shift, ShiftStatus } from './shift.entity';

export enum AssignmentStatus {
  ASSIGNED = 'ASSIGNED',       // Atanmış
  ACCEPTED = 'ACCEPTED',       // Kabul edilmiş
  REJECTED = 'REJECTED',       // Reddedilmiş
  COMPLETED = 'COMPLETED',     // Tamamlanmış
  PENDING_SWAP = 'PENDING_SWAP', // Takas bekliyor
  SWAPPED = 'SWAPPED'          // Takas edilmiş
}

@Entity('shift_assignments')
export class ShiftAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'shift_id' })
  shiftId: number;

  @ManyToOne(() => Shift, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.ASSIGNED
  })
  status: AssignmentStatus;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'clock_in_time', nullable: true, type: 'timestamp' })
  clockInTime: Date;

  @Column({ name: 'clock_out_time', nullable: true, type: 'timestamp' })
  clockOutTime: Date;

  @Column({ name: 'break_duration_minutes', nullable: true, default: 0 })
  breakDurationMinutes: number;

  @Column({ name: 'assigned_by' })
  assignedBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_by' })
  assignedByUser: User;

  @Column({ name: 'swap_requested_with', nullable: true })
  swapRequestedWith: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'swap_requested_with' })
  swapRequestedWithUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Fiili çalışma süresini saat cinsinden hesaplar
   */
  getActualWorkHours(): number {
    if (!this.clockInTime || !this.clockOutTime) return 0;
    
    const workMs = this.clockOutTime.getTime() - this.clockInTime.getTime();
    const breakMs = (this.breakDurationMinutes || 0) * 60 * 1000;
    
    return (workMs - breakMs) / (1000 * 60 * 60); // ms'yi saate çevir
  }
  
  /**
   * Fazla mesai süresini hesaplar 
   * @param standardHours Standart vardiya süresi
   */
  getOvertimeHours(standardHours: number): number {
    const actualHours = this.getActualWorkHours();
    return actualHours > standardHours ? actualHours - standardHours : 0;
  }
}
