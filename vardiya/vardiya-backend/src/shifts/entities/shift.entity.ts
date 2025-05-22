import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

export enum ShiftType {
  REGULAR = 'REGULAR',       // Normal mesai
  OVERTIME = 'OVERTIME',     // Fazla mesai
  NIGHT = 'NIGHT',           // Gece vardiyası
  WEEKEND = 'WEEKEND',       // Hafta sonu vardiyası
  HOLIDAY = 'HOLIDAY'        // Tatil vardiyası
}

export enum ShiftStatus {
  PLANNED = 'PLANNED',       // Planlanmış
  CONFIRMED = 'CONFIRMED',   // Onaylanmış
  IN_PROGRESS = 'IN_PROGRESS', // Devam ediyor
  COMPLETED = 'COMPLETED',   // Tamamlanmış
  CANCELLED = 'CANCELLED'    // İptal edilmiş
}

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  organizationId: number;

  @ManyToOne(() => Organization, organization => organization.id)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 255 })
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;
  
  @Column({ name: 'location', nullable: true, length: 255 })
  location: string;

  @Column({
    type: 'enum',
    enum: ShiftType,
    default: ShiftType.REGULAR
  })
  type: ShiftType;

  @Column({
    type: 'enum',
    enum: ShiftStatus,
    default: ShiftStatus.PLANNED
  })
  status: ShiftStatus;

  @Column({ nullable: true, name: 'min_required_employees', default: 1 })
  minRequiredEmployees: number;

  @Column({ nullable: true, name: 'max_allowed_employees' })
  maxAllowedEmployees: number;

  @Column({ nullable: true, name: 'hourly_rate', type: 'decimal', precision: 10, scale: 2 })
  hourlyRate: number;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Yardımcı hesaplama metotları
  
  /**
   * Vardiya süresini saat cinsinden hesaplar
   */
  getDurationHours(): number {
    const durationMs = this.endTime.getTime() - this.startTime.getTime();
    return durationMs / (1000 * 60 * 60); // ms'yi saate çevir
  }
  
  /**
   * Vardiya maliyetini hesaplar
   */
  getEstimatedCost(): number {
    if (!this.hourlyRate) return 0;
    return this.getDurationHours() * this.hourlyRate * this.minRequiredEmployees;
  }
}
