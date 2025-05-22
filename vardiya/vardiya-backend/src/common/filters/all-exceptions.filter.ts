import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../../logger/logger.service';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

/**
 * Tüm uygulama hatalarını yakalayıp işleyen filter
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('GlobalExceptionHandler');
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    // Varsayılan olarak 500 Internal Server Error
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage = 'Sunucu hatası';
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let validationErrors = null;
    
    // Hata tipine göre özel işlemler
    if (exception instanceof HttpException) {
      // NestJS HTTP hatası
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      
      if (typeof errorResponse === 'object') {
        const errorObj = errorResponse as Record<string, any>;
        errorMessage = errorObj.message || errorMessage;
        validationErrors = errorObj.errors || null;
        errorCode = errorObj.code || (status === HttpStatus.BAD_REQUEST ? 'BAD_REQUEST' : errorCode);
      } else if (typeof errorResponse === 'string') {
        errorMessage = errorResponse;
      }
    } else if (exception instanceof QueryFailedError) {
      // TypeORM sorgu hatası
      status = HttpStatus.BAD_REQUEST;
      errorMessage = 'Veritabanı sorgu hatası';
      errorCode = 'DATABASE_ERROR';
      
      // Yinelenen değer hatası kontrolü
      if ((exception as any).code === '23505') {
        errorMessage = 'Bu kayıt zaten mevcut';
        errorCode = 'DUPLICATE_ENTRY';
      }
    } else if (exception instanceof EntityNotFoundError) {
      // TypeORM entity bulunamadı hatası
      status = HttpStatus.NOT_FOUND;
      errorMessage = 'Kayıt bulunamadı';
      errorCode = 'ENTITY_NOT_FOUND';
    } else {
      // Diğer tüm hatalar
      const error = exception as Error;
      errorMessage = error.message || errorMessage;
    }
    
    // Hata detayları loglama
    const stack = exception instanceof Error ? exception.stack : 'No stack trace';
    this.logger.error(
      `[${errorCode}] ${errorMessage}`, 
      stack,
      { 
        statusCode: status,
        path: request.url,
        method: request.method,
        ip: request.ip,
        userId: (request as any).user?.id,
      }
    );
    
    // Standardize edilmiş hata yanıtı
    response.status(status).json({
      success: false,
      statusCode: status,
      message: errorMessage,
      errorCode,
      errors: validationErrors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
