import { Module, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { LoggerModule } from '../logger/logger.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    LoggerModule
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    }
  ],
  exports: []
})
export class SecurityModule {}
