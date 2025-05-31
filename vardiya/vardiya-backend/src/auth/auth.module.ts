import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    // Kullanıcı, organizasyon ve bildirim modüllerini içe aktar
    UsersModule,
    OrganizationsModule,
    NotificationsModule,
    
    // User entity'sini TypeORM için kaydet (JwtStrategy için gerekli)
    TypeOrmModule.forFeature([User]),
    
    // Passport entegrasyonu
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // JWT modülü yapılandırması
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'varsayilan_gizli_anahtar'),
        signOptions: { 
          expiresIn: configService.get('JWT_EXPIRES_IN', '30d') // Token süresini 30 güne çıkardık
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard
  ],
  exports: [
    AuthService,
    JwtStrategy, 
    PassportModule,
    JwtAuthGuard,
    RolesGuard
  ],
})
export class AuthModule {}