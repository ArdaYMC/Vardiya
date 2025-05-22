import { ApiProperty } from '@nestjs/swagger';
import { Notification, NotificationChannel, NotificationType } from '../entities/notification.entity';

export class NotificationResponseDto {
  @ApiProperty({ description: 'Bildirim ID', example: 1 })
  id: number;

  @ApiProperty({ 
    description: 'Bildirim tipi', 
    enum: NotificationType, 
    example: NotificationType.SHIFT_ASSIGNED 
  })
  type: NotificationType;

  @ApiProperty({ description: 'Bildirim başlığı', example: 'Yeni Vardiya Ataması' })
  title: string;

  @ApiProperty({ description: 'Bildirim içeriği', example: 'Pazartesi vardiyasına atandınız' })
  content: string;

  @ApiProperty({ 
    description: 'Bildirim kanalı', 
    enum: NotificationChannel, 
    example: NotificationChannel.IN_APP 
  })
  channel: NotificationChannel;

  @ApiProperty({ description: 'Bildirim okundu mu', example: false })
  read: boolean;

  @ApiProperty({ 
    description: 'Bildirim metadatası', 
    example: { shiftId: 123, startTime: '2025-06-01T09:00:00Z' } 
  })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Alıcı kullanıcı ID', example: 1 })
  recipientId: number;

  @ApiProperty({ description: 'Organizasyon ID', example: 1 })
  organizationId: number;

  @ApiProperty({ description: 'Oluşturulma tarihi', example: '2025-05-20T14:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Güncellenme tarihi', example: '2025-05-20T14:00:00Z' })
  updatedAt: Date;

  @ApiProperty({ description: 'Gönderilme tarihi', example: '2025-05-20T14:00:00Z', required: false })
  sentAt: Date;

  constructor(notification: Notification) {
    this.id = notification.id;
    this.type = notification.type;
    this.title = notification.title;
    this.content = notification.content;
    this.channel = notification.channel;
    this.read = notification.read;
    this.metadata = notification.metadata;
    this.recipientId = notification.recipientId;
    this.organizationId = notification.organizationId;
    this.createdAt = notification.createdAt;
    this.updatedAt = notification.updatedAt;
    this.sentAt = notification.sentAt;
  }
}
