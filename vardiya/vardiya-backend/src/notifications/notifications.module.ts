import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailTestController } from './email/email-test.controller';
import { Notification } from './entities/notification.entity';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email/email.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    ConfigModule,
    forwardRef(() => UsersModule)
  ],
  controllers: [NotificationsController, EmailTestController],
  providers: [NotificationsService, EmailService],
  exports: [NotificationsService, EmailService]
})
export class NotificationsModule {}
