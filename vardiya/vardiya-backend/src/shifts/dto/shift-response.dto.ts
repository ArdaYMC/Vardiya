import { ApiProperty } from '@nestjs/swagger';
import { Shift, ShiftStatus, ShiftType } from '../entities/shift.entity';
import { Exclude, Expose } from 'class-transformer';

export class ShiftResponseDto {
  @ApiProperty({ description: 'Vardiya ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Organizasyon ID', example: 1 })
  organizationId: number;

  @ApiProperty({ description: 'Vardiya başlığı', example: 'Pazartesi Sabah Vardiyası' })
  title: string;

  @ApiProperty({ description: 'Vardiya açıklaması', example: 'Haftalık rutin sabah vardiyası' })
  description: string;

  @ApiProperty({ description: 'Vardiya başlangıç zamanı', example: '2025-06-01T09:00:00Z' })
  startTime: Date;

  @ApiProperty({ description: 'Vardiya bitiş zamanı', example: '2025-06-01T17:00:00Z' })
  endTime: Date;

  @ApiProperty({ description: 'Vardiya lokasyonu', example: 'Ana Bina, Kat 2' })
  location: string;

  @ApiProperty({ description: 'Vardiya tipi', enum: ShiftType, example: ShiftType.REGULAR })
  type: ShiftType;

  @ApiProperty({ description: 'Vardiya durumu', enum: ShiftStatus, example: ShiftStatus.PLANNED })
  status: ShiftStatus;

  @ApiProperty({ description: 'Minimum gereken çalışan sayısı', example: 2 })
  minRequiredEmployees: number;

  @ApiProperty({ description: 'Maksimum izin verilen çalışan sayısı', example: 5 })
  maxAllowedEmployees: number;

  @ApiProperty({ description: 'Saatlik ücret oranı', example: 50.75 })
  hourlyRate: number;

  @ApiProperty({ description: 'Vardiyayı oluşturan kişi ID', example: 1 })
  createdBy: number;

  @ApiProperty({ description: 'Vardiya süresi (saat)', example: 8 })
  @Expose()
  get durationHours(): number {
    const durationMs = this.endTime.getTime() - this.startTime.getTime();
    return durationMs / (1000 * 60 * 60); // ms'yi saate çevir
  }

  @ApiProperty({ description: 'Tahmini toplam maliyet', example: 812 })
  @Expose()
  get estimatedCost(): number {
    if (!this.hourlyRate) return 0;
    return this.durationHours * this.hourlyRate * this.minRequiredEmployees;
  }

  @ApiProperty({ description: 'Oluşturulma tarihi', example: '2025-05-20T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Güncelleme tarihi', example: '2025-05-20T14:30:00Z' })
  updatedAt: Date;

  @Exclude()
  organization: any;

  @Exclude()
  creator: any;

  constructor(partial: Partial<Shift>) {
    Object.assign(this, partial);
  }
}
