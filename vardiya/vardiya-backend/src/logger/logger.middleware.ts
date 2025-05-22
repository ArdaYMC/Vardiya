import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from './logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly loggerService: LoggerService) {
    this.loggerService.setContext('HTTP');
  }

  /**
   * HTTP istek ve yanıtlarını loglamak için middleware
   * @param req HTTP isteği
   * @param res HTTP yanıtı
   * @param next Sonraki middleware
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // İstek başlangıç zamanını kaydet
    const startTime = process.hrtime();
    
    // Orijinal end metodunu sakla
    const originalEnd = res.end;
    
    // İstek detaylarını logla
    this.loggerService.log(`Incoming request: ${req.method} ${req.originalUrl}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      query: req.query,
      body: this.sanitizeBody(req.body)
    });

    // Yanıt gönderildiğinde performans metriklerini hesapla ve logla
    res.end = function(...args: any[]): any {
      const result = originalEnd.apply(res, args);
      
      // İstek ve yanıt detaylarını logla
      this.loggerService.logHttpRequest(req, res, startTime);
      
      return result;
    }.bind(this);

    next();
  }

  /**
   * Hassas bilgileri loglardan temizler
   * @param body İstek gövdesi
   * @returns Temizlenmiş gövde
   */
  private sanitizeBody(body: any): any {
    if (!body) {
      return body;
    }

    // Kopyasını oluştur
    const sanitized = { ...body };
    
    // Hassas alanları maskele
    const sensitiveFields = ['password', 'passwordConfirm', 'token', 'refreshToken', 'secret', 'apiKey'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***********';
      }
    }
    
    return sanitized;
  }
}
