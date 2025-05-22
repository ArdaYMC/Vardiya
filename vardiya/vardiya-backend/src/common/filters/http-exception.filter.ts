import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../../logger/logger.service';

/**
 * HTTP isteklerinde oluşan tüm hataları yakalayıp standartlaştıran filter
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('ExceptionFilter');
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();

    // Hata mesajını ve olası validate hatalarını çıkar
    let errorMessage: string = 'Hata oluştu';
    let validationErrors = null;
    let errorCode = 'INTERNAL_ERROR';

    if (typeof errorResponse === 'object') {
      const errorObj = errorResponse as Record<string, any>;
      errorMessage = errorObj.message || errorMessage;
      validationErrors = errorObj.errors || null;
      errorCode = errorObj.code || errorCode;
    } else if (typeof errorResponse === 'string') {
      errorMessage = errorResponse;
    }

    // Hata logla
    const logMethod = status >= 500 ? 'error' : 'warn';
    const logData = {
      statusCode: status,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      errorCode,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      userId: (request as any).user?.id,
    };

    this.logger[logMethod](
      `${status} - ${errorMessage}`,
      validationErrors ? JSON.stringify(validationErrors) : undefined,
      logData
    );

    // Standardize edilmiş yanıt gönder
    response.status(status).json({
      success: false,
      statusCode: status,
      message: errorMessage,
      errors: validationErrors,
      errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
