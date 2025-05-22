import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannel, NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ 
    description: 'Bildirim tipi', 
    enum: NotificationType, 
    example: NotificationType.SHIFT_ASSIGNED 
  })
  @IsNotEmpty({ message: 'Bildirim tipi zorunludur' })
  @IsEnum(NotificationType, { message: 'Geçerli bir bildirim tipi seçiniz' })
  type: NotificationType;

  @ApiProperty({ description: 'Bildirim başlığı', example: 'Yeni Vardiya Ataması' })
  @IsNotEmpty({ message: 'Bildirim başlığı zorunludur' })
  @IsString({ message: 'Bildirim başlığı metin olmalıdır' })
  title: string;

  @ApiProperty({ description: 'Bildirim içeriği', example: 'Pazartesi vardiyasına atandınız' })
  @IsNotEmpty({ message: 'Bildirim içeriği zorunludur' })
  @IsString({ message: 'Bildirim içeriği metin olmalıdır' })
  content: string;

  @ApiProperty({ 
    description: 'Bildirim kanalı', 
    enum: NotificationChannel, 
    default: NotificationChannel.IN_APP,
    example: NotificationChannel.IN_APP
  })
  @IsOptional()
  @IsEnum(NotificationChannel, { message: 'Geçerli bir bildirim kanalı seçiniz' })
  channel?: NotificationChannel;

  @ApiProperty({ 
    description: 'Bildirim metadatası (JSON formatında)', 
    required: false,
    example: { shiftId: 123, startTime: '2025-06-01T09:00:00Z' }
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Alıcı kullanıcı ID', example: 1 })
  @IsNotEmpty({ message: 'Alıcı ID zorunludur' })
  @IsNumber({}, { message: 'Alıcı ID sayı olmalıdır' })
  recipientId: number;

  @ApiProperty({ description: 'Organizasyon ID', example: 1 })
  @IsNotEmpty({ message: 'Organizasyon ID zorunludur' })
  @IsNumber({}, { message: 'Organizasyon ID sayı olmalıdır' })
  organizationId: number;
}
