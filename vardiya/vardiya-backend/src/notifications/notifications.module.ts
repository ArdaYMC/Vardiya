import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    ConfigModule
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
