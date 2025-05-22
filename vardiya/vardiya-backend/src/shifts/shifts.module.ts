import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { Shift } from './entities/shift.entity';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, ShiftAssignment, User]),
    UsersModule,
    AuthModule,
    NotificationsModule
  ],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [ShiftsService]
})
export class ShiftsModule {}
