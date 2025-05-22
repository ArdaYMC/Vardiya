import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Notification, NotificationChannel, NotificationType } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    private configService: ConfigService,
  ) {}

  /**
   * Yeni bir bildirim oluşturur
   * @param createNotificationDto Bildirim verileri
   * @returns Oluşturulan bildirim
   */
  async create(createNotificationDto: CreateNotificationDto): Promise<NotificationResponseDto> {
    const notification = this.notificationsRepository.create({
      ...createNotificationDto,
      channel: createNotificationDto.channel || NotificationChannel.IN_APP,
    });

    const savedNotification = await this.notificationsRepository.save(notification);
    
    // Kanal tipine göre bildirim gönderme işlemi
    if (savedNotification.channel === NotificationChannel.EMAIL) {
      await this.sendEmailNotification(savedNotification);
    } else if (savedNotification.channel === NotificationChannel.PUSH) {
      await this.sendPushNotification(savedNotification);
    }
    
    // Bildirim gönderildi olarak işaretleme
    if (savedNotification.channel !== NotificationChannel.IN_APP) {
      savedNotification.sentAt = new Date();
      await this.notificationsRepository.save(savedNotification);
    }
    
    return new NotificationResponseDto(savedNotification);
  }

  /**
   * Çoklu bildirim oluşturmak için kullanılır (toplu bildirim)
   * @param createNotificationDtos Bildirim verileri dizisi
   * @returns Oluşturulan bildirimler
   */
  async createMany(createNotificationDtos: CreateNotificationDto[]): Promise<NotificationResponseDto[]> {
    const notifications = createNotificationDtos.map(dto => 
      this.notificationsRepository.create({
        ...dto,
        channel: dto.channel || NotificationChannel.IN_APP,
      })
    );
    
    const savedNotifications = await this.notificationsRepository.save(notifications);
    
    // Bildirim kanallarına göre gönderme işlemleri
    for (const notification of savedNotifications) {
      if (notification.channel === NotificationChannel.EMAIL) {
        await this.sendEmailNotification(notification);
      } else if (notification.channel === NotificationChannel.PUSH) {
        await this.sendPushNotification(notification);
      }
      
      if (notification.channel !== NotificationChannel.IN_APP) {
        notification.sentAt = new Date();
      }
    }
    
    await this.notificationsRepository.save(savedNotifications);
    
    return savedNotifications.map(notification => new NotificationResponseDto(notification));
  }

  /**
   * Kullanıcıya ait bildirimleri listeler
   * @param userId Kullanıcı ID
   * @param organizationId Organizasyon ID
   * @param showRead Okunmuş bildirimleri de göster
   * @returns Bildirim listesi
   */
  async findAllForUser(
    userId: number, 
    organizationId: number,
    showRead: boolean = false
  ): Promise<NotificationResponseDto[]> {
    const whereOptions: FindOptionsWhere<Notification> = {
      recipientId: userId,
      organizationId
    };
    
    if (!showRead) {
      whereOptions.read = false;
    }
    
    const notifications = await this.notificationsRepository.find({
      where: whereOptions,
      order: { createdAt: 'DESC' }
    });
    
    return notifications.map(notification => new NotificationResponseDto(notification));
  }

  /**
   * Belirli bir bildirimi ID'ye göre getirir
   * @param id Bildirim ID
   * @returns Bulunan bildirim
   */
  async findOne(id: number): Promise<NotificationResponseDto> {
    const notification = await this.notificationsRepository.findOne({
      where: { id }
    });
    
    if (!notification) {
      throw new NotFoundException(`ID: ${id} olan bildirim bulunamadı`);
    }
    
    return new NotificationResponseDto(notification);
  }

  /**
   * Bildirim okundu olarak işaretleme
   * @param id Bildirim ID
   * @param userId Kullanıcı ID (güvenlik kontrolü için)
   * @returns Güncellenmiş bildirim
   */
  async markAsRead(id: number, userId: number): Promise<NotificationResponseDto> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, recipientId: userId }
    });
    
    if (!notification) {
      throw new NotFoundException(`ID: ${id} olan bildirim bulunamadı veya bu kullanıcıya ait değil`);
    }
    
    notification.read = true;
    notification.updatedAt = new Date();
    
    const updatedNotification = await this.notificationsRepository.save(notification);
    return new NotificationResponseDto(updatedNotification);
  }

  /**
   * Tüm bildirimleri okundu olarak işaretleme (bir kullanıcı için)
   * @param userId Kullanıcı ID
   * @param organizationId Organizasyon ID
   * @returns İşlem sonucu
   */
  async markAllAsRead(userId: number, organizationId: number): Promise<{ success: boolean; count: number }> {
    const result = await this.notificationsRepository.update(
      { recipientId: userId, organizationId, read: false },
      { read: true, updatedAt: new Date() }
    );
    
    return { 
      success: true, 
      count: result.affected || 0 
    };
  }

  /**
   * Bildirim silme (yönetici veya bildirim sahibi)
   * @param id Bildirim ID
   * @param userId Kullanıcı ID (güvenlik kontrolü için)
   * @returns İşlem sonucu
   */
  async remove(id: number, userId: number): Promise<{ success: boolean; message: string }> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, recipientId: userId }
    });
    
    if (!notification) {
      throw new NotFoundException(`ID: ${id} olan bildirim bulunamadı veya bu kullanıcıya ait değil`);
    }
    
    await this.notificationsRepository.remove(notification);
    
    return {
      success: true,
      message: 'Bildirim başarıyla silindi'
    };
  }

  /**
   * Vardiya ataması bildirimi oluşturma yardımcı metodu
   * @param shiftId Vardiya ID
   * @param shiftTitle Vardiya başlığı
   * @param startTime Başlangıç zamanı
   * @param userId Kullanıcı ID
   * @param organizationId Organizasyon ID
   * @returns Oluşturulan bildirim
   */
  async createShiftAssignmentNotification(
    shiftId: number,
    shiftTitle: string,
    startTime: Date,
    userId: number,
    organizationId: number
  ): Promise<NotificationResponseDto> {
    const notificationDto: CreateNotificationDto = {
      type: NotificationType.SHIFT_ASSIGNED,
      title: 'Yeni Vardiya Ataması',
      content: `"${shiftTitle}" vardiyasına atandınız. Başlangıç: ${startTime.toLocaleString()}`,
      recipientId: userId,
      organizationId,
      metadata: {
        shiftId,
        startTime: startTime.toISOString(),
      },
    };
    
    return this.create(notificationDto);
  }

  /**
   * Vardiya güncellemesi bildirimi oluşturma yardımcı metodu
   * @param shiftId Vardiya ID
   * @param shiftTitle Vardiya başlığı
   * @param changes Yapılan değişiklikler
   * @param affectedUserIds Etkilenen kullanıcı ID'leri
   * @param organizationId Organizasyon ID
   * @returns Oluşturulan bildirimler
   */
  async createShiftUpdateNotifications(
    shiftId: number,
    shiftTitle: string,
    changes: string,
    affectedUserIds: number[],
    organizationId: number
  ): Promise<NotificationResponseDto[]> {
    const notificationDtos: CreateNotificationDto[] = affectedUserIds.map(userId => ({
      type: NotificationType.SHIFT_UPDATED,
      title: 'Vardiya Güncellendi',
      content: `"${shiftTitle}" vardiyasında değişiklik yapıldı: ${changes}`,
      recipientId: userId,
      organizationId,
      metadata: {
        shiftId,
      },
    }));
    
    return this.createMany(notificationDtos);
  }

  /**
   * E-posta bildirimi gönderme (placeholder - gerçek implementasyon eklenecek)
   * @param notification Bildirim
   */
  private async sendEmailNotification(notification: Notification): Promise<void> {
    // E-posta servisini entegre et (örn. Nodemailer, SendGrid, vb.)
    // Bu örnekte simüle ediliyor
    console.log(`[EMAIL] To: User ${notification.recipientId}, Subject: ${notification.title}`);
    console.log(`[EMAIL] Content: ${notification.content}`);
    
    // Gerçek implementasyon için:
    // const emailService = new EmailService(this.configService);
    // await emailService.sendEmail(notification.recipientId, notification.title, notification.content);
  }

  /**
   * Push bildirimi gönderme (placeholder - gerçek implementasyon eklenecek)
   * @param notification Bildirim
   */
  private async sendPushNotification(notification: Notification): Promise<void> {
    // Push notification servisini entegre et (örn. Firebase, OneSignal, vb.)
    // Bu örnekte simüle ediliyor
    console.log(`[PUSH] To: User ${notification.recipientId}, Title: ${notification.title}`);
    console.log(`[PUSH] Content: ${notification.content}`);
    
    // Gerçek implementasyon için:
    // const pushService = new PushService(this.configService);
    // await pushService.sendPushNotification(notification.recipientId, notification.title, notification.content);
  }
}
