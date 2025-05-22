import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private limiter: any;

  constructor(private configService: ConfigService) {
    const windowMs = this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000); // 15 dakika
    const max = this.configService.get<number>('RATE_LIMIT_MAX', 100); // 15 dakikada maksimum 100 istek

    this.limiter = rateLimit({
      windowMs,
      max,
      standardHeaders: true, // RateLimit başlıklarını ekle
      legacyHeaders: false, // X-RateLimit başlıklarını kaldır
      message: {
        success: false,
        statusCode: 429,
        message: 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin.',
        errorCode: 'TOO_MANY_REQUESTS',
      },
      skip: (req: Request) => {
        // Geliştirme ortamında veya iç IP'lerden gelen isteklere rate limit uygulanmayabilir
        const isDevelopment = process.env.NODE_ENV === 'development';
        const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1';

        return isDevelopment && isLocalhost;
      }
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.limiter(req, res, next);
  }
}
