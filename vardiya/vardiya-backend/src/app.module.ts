import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ShiftsModule } from './shifts/shifts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LoggerModule } from './logger/logger.module';
import { LoggerMiddleware } from './logger/logger.middleware';
import { SecurityModule } from './common/security.module';
import { RateLimiterMiddleware } from './common/middleware/rate-limiter.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'vardiya'),
        password: configService.get('DB_PASSWORD', 'vardiya123'),
        database: configService.get('DB_NAME', 'vardiya_db'),
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: configService.get<boolean>('DB_SYNC', false),
        logging: configService.get<boolean>('DB_LOGGING', false),
      }),
    }),
    OrganizationsModule,
    UsersModule,
    AuthModule,
    ShiftsModule,
    NotificationsModule,
    LoggerModule,
    SecurityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Tüm rotalar için loglama ve güvenlik middleware'lerini uygula
    consumer
      .apply(LoggerMiddleware, RateLimiterMiddleware)
      .forRoutes('*');
  }
}