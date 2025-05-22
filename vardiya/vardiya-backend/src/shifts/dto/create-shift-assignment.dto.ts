import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { AssignmentStatus } from '../entities/shift-assignment.entity';

export class CreateShiftAssignmentDto {
  @ApiProperty({ description: 'Vardiya ID', example: 1 })
  @IsNotEmpty({ message: 'Vardiya ID zorunludur' })
  @IsNumber({}, { message: 'Vardiya ID sayı olmalıdır' })
  shiftId: number;

  @ApiProperty({ description: 'Kullanıcı ID', example: 1 })
  @IsNotEmpty({ message: 'Kullanıcı ID zorunludur' })
  @IsNumber({}, { message: 'Kullanıcı ID sayı olmalıdır' })
  userId: number;

  @ApiProperty({ description: 'Atama durumu', enum: AssignmentStatus, default: AssignmentStatus.ASSIGNED, example: AssignmentStatus.ASSIGNED })
  @IsOptional()
  @IsEnum(AssignmentStatus, { message: 'Geçerli bir atama durumu seçiniz' })
  status?: AssignmentStatus;

  @ApiProperty({ description: 'Notlar', required: false, example: 'Stajyer çalışan, yönlendirmeye ihtiyaç duyabilir' })
  @IsOptional()
  @IsString({ message: 'Notlar metin olmalıdır' })
  notes?: string;

  @ApiProperty({ description: 'Atamayı yapan kişi ID', example: 1 })
  @IsNotEmpty({ message: 'Atamayı yapan kişi ID zorunludur' })
  @IsNumber({}, { message: 'Atamayı yapan kişi ID sayı olmalıdır' })
  assignedBy: number;
}
