import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete, 
  UseGuards, 
  Request, 
  Query, 
  Patch, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Bildirimler')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Yeni bildirim oluştur (Sadece yöneticiler)' })
  @ApiResponse({ status: 201, description: 'Bildirim başarıyla oluşturuldu', type: NotificationResponseDto })
  create(@Body() createNotificationDto: CreateNotificationDto, @Request() req): Promise<NotificationResponseDto> {
    // Organizasyon ID'sini mevcut kullanıcının organizasyonundan al (güvenlik için)
    if (!createNotificationDto.organizationId) {
      createNotificationDto.organizationId = req.user.organizationId;
    }
    
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Kullanıcı bildirimlerini getir' })
  @ApiQuery({ name: 'showRead', required: false, type: Boolean, description: 'Okunmuş bildirimleri de göster' })
  @ApiResponse({ status: 200, description: 'Bildirim listesi', type: [NotificationResponseDto] })
  findAll(
    @Request() req,
    @Query('showRead') showRead?: string,
  ): Promise<NotificationResponseDto[]> {
    const showReadBool = showRead === 'true';
    return this.notificationsService.findAllForUser(
      req.user.id, 
      req.user.organizationId,
      showReadBool
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID\'ye göre bildirim getir' })
  @ApiParam({ name: 'id', type: Number, description: 'Bildirim ID' })
  @ApiResponse({ status: 200, description: 'Bildirim detayı', type: NotificationResponseDto })
  @ApiResponse({ status: 404, description: 'Bildirim bulunamadı' })
  findOne(@Param('id') id: string): Promise<NotificationResponseDto> {
    return this.notificationsService.findOne(+id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Bildirimi okundu olarak işaretle' })
  @ApiParam({ name: 'id', type: Number, description: 'Bildirim ID' })
  @ApiResponse({ status: 200, description: 'Bildirim okundu olarak işaretlendi', type: NotificationResponseDto })
  @ApiResponse({ status: 404, description: 'Bildirim bulunamadı' })
  markAsRead(@Param('id') id: string, @Request() req): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(+id, req.user.id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tüm bildirimleri okundu olarak işaretle' })
  @ApiResponse({ status: 200, description: 'Tüm bildirimler okundu olarak işaretlendi' })
  markAllAsRead(@Request() req): Promise<{ success: boolean; count: number }> {
    return this.notificationsService.markAllAsRead(req.user.id, req.user.organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bildirim sil' })
  @ApiParam({ name: 'id', type: Number, description: 'Bildirim ID' })
  @ApiResponse({ status: 200, description: 'Bildirim başarıyla silindi' })
  @ApiResponse({ status: 404, description: 'Bildirim bulunamadı' })
  remove(@Param('id') id: string, @Request() req): Promise<{ success: boolean; message: string }> {
    return this.notificationsService.remove(+id, req.user.id);
  }
}
