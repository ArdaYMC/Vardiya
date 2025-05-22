import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context?: string;
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    const { combine, timestamp, printf, colorize, align } = winston.format;
    
    // Loglama seviyesini config'den al, yoksa 'info' kullan
    const logLevel = this.configService.get<string>('LOG_LEVEL', 'info');
    
    // Formatı tanımla
    const logFormat = printf((info) => {
      const { timestamp, level, message, context, trace } = info;
      return `${timestamp} [${level}] [${context || 'Application'}]: ${message}${trace ? `\n${trace}` : ''}`;
    });
    
    // Winston logger'ı yapılandır
    this.logger = winston.createLogger({
      level: logLevel,
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        align(),
        logFormat
      ),
      defaultMeta: { service: 'vardiya-api' },
      transports: [
        // Konsol log'ları
        new winston.transports.Console({
          format: combine(
            colorize({ all: true }),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            align(),
            logFormat
          )
        }),

        // Günlük dönen dosya log'ları - hatalar
        new winston.transports.DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'error',
        }),

        // Günlük dönen dosya log'ları - tüm loglar
        new winston.transports.DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
        }),
      ],
    });
  }

  /**
   * Log seviyesini ayarlar
   * @param level Log seviyesi
   */
  setLogLevel(level: string): void {
    this.logger.level = level;
  }

  /**
   * Logger için context (bağlam) ayarlar
   * @param context Logger bağlamı
   */
  setContext(context: string): this {
    this.context = context;
    return this;
  }

  /**
   * Debug seviyesinde log mesajı
   * @param message Log mesajı
   * @param optionalParams Ek parametreler
   */
  debug(message: any, ...optionalParams: any[]): void {
    this.logger.debug(this.formatMessage(message), {
      context: this.context,
      ...this.extractMetadata(optionalParams),
    });
  }

  /**
   * Verbose seviyesinde log mesajı
   * @param message Log mesajı
   * @param optionalParams Ek parametreler
   */
  verbose(message: any, ...optionalParams: any[]): void {
    this.logger.verbose(this.formatMessage(message), {
      context: this.context,
      ...this.extractMetadata(optionalParams),
    });
  }

  /**
   * Log seviyesinde log mesajı
   * @param message Log mesajı
   * @param optionalParams Ek parametreler
   */
  log(message: any, ...optionalParams: any[]): void {
    this.logger.info(this.formatMessage(message), {
      context: this.context,
      ...this.extractMetadata(optionalParams),
    });
  }

  /**
   * Warn seviyesinde log mesajı
   * @param message Log mesajı
   * @param optionalParams Ek parametreler
   */
  warn(message: any, ...optionalParams: any[]): void {
    this.logger.warn(this.formatMessage(message), {
      context: this.context,
      ...this.extractMetadata(optionalParams),
    });
  }

  /**
   * Error seviyesinde log mesajı
   * @param message Log mesajı
   * @param optionalParams Ek parametreler
   */
  error(message: any, trace?: string, ...optionalParams: any[]): void {
    this.logger.error(this.formatMessage(message), {
      context: this.context,
      trace,
      ...this.extractMetadata(optionalParams),
    });
  }

  /**
   * Fatal seviyesinde log mesajı
   * @param message Log mesajı
   * @param optionalParams Ek parametreler
   */
  fatal(message: any, ...optionalParams: any[]): void {
    this.logger.error(`[FATAL] ${this.formatMessage(message)}`, {
      context: this.context,
      ...this.extractMetadata(optionalParams),
    });
  }

  /**
   * API isteklerini loglar
   * @param req HTTP isteği
   * @param res HTTP yanıtı
   * @param startTime İsteğin başlangıç zamanı
   */
  logHttpRequest(req: any, res: any, startTime: [number, number]): void {
    const duration = this.calculateDuration(startTime);
    const userAgent = req.get('user-agent') || '';
    const { ip, method, originalUrl } = req;
    const contentLength = res.get('content-length') || 0;
    const statusCode = res.statusCode;
    
    const message = `${method} ${originalUrl} ${statusCode} ${contentLength} - ${duration.toFixed(2)}ms`;
    
    // HTTP durum koduna göre log seviyesini belirle
    if (statusCode >= 500) {
      this.error(message, undefined, { ip, userAgent });
    } else if (statusCode >= 400) {
      this.warn(message, { ip, userAgent });
    } else {
      this.log(message, { ip, userAgent });
    }
  }

  /**
   * Metriğini loglar
   * @param name Metrik adı
   * @param value Metrik değeri
   * @param tags Metrik etiketleri
   */
  logMetric(name: string, value: number, tags: Record<string, any> = {}): void {
    this.logger.info(`METRIC: ${name}=${value}`, {
      context: this.context || 'metrics',
      metric: name,
      value,
      tags,
    });
  }

  /**
   * İş olayını loglar
   * @param eventName Olay adı
   * @param payload Olay verileri
   */
  logBusinessEvent(eventName: string, payload: Record<string, any> = {}): void {
    this.logger.info(`EVENT: ${eventName}`, {
      context: this.context || 'business-events',
      event: eventName,
      payload,
    });
  }

  /**
   * Mesajı formatlar
   * @param message Log mesajı
   * @returns Formatlanmış mesaj
   */
  private formatMessage(message: any): string {
    if (typeof message === 'object') {
      return JSON.stringify(message);
    }
    return message;
  }

  /**
   * İstek süresini hesaplar
   * @param startTime İsteğin başlangıç zamanı
   * @returns İstek süresi (ms)
   */
  private calculateDuration(startTime: [number, number]): number {
    const diff = process.hrtime(startTime);
    return diff[0] * 1000 + diff[1] / 1000000;
  }

  /**
   * Opsiyonel parametrelerden metadata çıkarır
   * @param optionalParams Opsiyonel parametreler
   * @returns Metadata
   */
  private extractMetadata(optionalParams: any[]): Record<string, any> {
    if (optionalParams.length && typeof optionalParams[optionalParams.length - 1] === 'object') {
      return optionalParams[optionalParams.length - 1];
    }
    return {};
  }
}
