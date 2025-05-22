import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsDate, IsDateString, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ShiftType, ShiftStatus } from '../entities/shift.entity';

export class CreateShiftDto {
  @ApiProperty({ description: 'Organizasyon ID', example: 1 })
  @IsNotEmpty({ message: 'Organizasyon ID zorunludur' })
  @IsNumber({}, { message: 'Organizasyon ID sayı olmalıdır' })
  organizationId: number;

  @ApiProperty({ description: 'Vardiya başlığı', example: 'Pazartesi Sabah Vardiyası' })
  @IsNotEmpty({ message: 'Vardiya başlığı zorunludur' })
  @IsString({ message: 'Vardiya başlığı metin olmalıdır' })
  title: string;

  @ApiProperty({ description: 'Vardiya açıklaması', required: false, example: 'Haftalık rutin sabah vardiyası' })
  @IsOptional()
  @IsString({ message: 'Vardiya açıklaması metin olmalıdır' })
  description?: string;

  @ApiProperty({ description: 'Vardiya başlangıç zamanı', example: '2025-06-01T09:00:00Z' })
  @IsNotEmpty({ message: 'Başlangıç zamanı zorunludur' })
  @IsDateString({}, { message: 'Geçerli bir tarih formatı giriniz' })
  startTime: string;

  @ApiProperty({ description: 'Vardiya bitiş zamanı', example: '2025-06-01T17:00:00Z' })
  @IsNotEmpty({ message: 'Bitiş zamanı zorunludur' })
  @IsDateString({}, { message: 'Geçerli bir tarih formatı giriniz' })
  endTime: string;

  @ApiProperty({ description: 'Vardiya lokasyonu', required: false, example: 'Ana Bina, Kat 2' })
  @IsOptional()
  @IsString({ message: 'Lokasyon metin olmalıdır' })
  location?: string;

  @ApiProperty({ description: 'Vardiya tipi', enum: ShiftType, default: ShiftType.REGULAR, example: ShiftType.REGULAR })
  @IsOptional()
  @IsEnum(ShiftType, { message: 'Geçerli bir vardiya tipi seçiniz' })
  type?: ShiftType;

  @ApiProperty({ description: 'Vardiya durumu', enum: ShiftStatus, default: ShiftStatus.PLANNED, example: ShiftStatus.PLANNED })
  @IsOptional()
  @IsEnum(ShiftStatus, { message: 'Geçerli bir vardiya durumu seçiniz' })
  status?: ShiftStatus;

  @ApiProperty({ description: 'Minimum gereken çalışan sayısı', required: false, example: 2, default: 1 })
  @IsOptional()
  @IsNumber({}, { message: 'Minimum çalışan sayısı sayı olmalıdır' })
  @Min(1, { message: 'Minimum çalışan sayısı en az 1 olmalıdır' })
  minRequiredEmployees?: number;

  @ApiProperty({ description: 'Maksimum izin verilen çalışan sayısı', required: false, example: 5 })
  @IsOptional()
  @IsNumber({}, { message: 'Maksimum çalışan sayısı sayı olmalıdır' })
  @ValidateIf((o) => o.minRequiredEmployees !== undefined)
  @Min(1, { message: 'Maksimum çalışan sayısı en az 1 olmalıdır' })
  maxAllowedEmployees?: number;

  @ApiProperty({ description: 'Saatlik ücret oranı', required: false, example: 50.75 })
  @IsOptional()
  @IsNumber({}, { message: 'Saatlik ücret oranı sayı olmalıdır' })
  @Min(0, { message: 'Saatlik ücret oranı negatif olamaz' })
  hourlyRate?: number;

  @ApiProperty({ description: 'Vardiyayı oluşturan kişi ID', example: 1 })
  @IsNotEmpty({ message: 'Oluşturan kişi ID zorunludur' })
  @IsNumber({}, { message: 'Oluşturan kişi ID sayı olmalıdır' })
  createdBy: number;
}
