import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from './logger.service';
import { LoggerMiddleware } from './logger.middleware';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [LoggerService],
  exports: [LoggerService]
})
export class LoggerModule {}
