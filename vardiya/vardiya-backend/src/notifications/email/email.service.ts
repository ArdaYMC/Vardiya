import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    // SMTP yapılandırması
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
      tls: {
        // SSL/TLS sorunlarını çözmek için
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      }
    });
  }

  /**
   * E-posta gönderme
   * @param to Alıcı e-posta adresi
   * @param subject E-posta konusu
   * @param html E-posta içeriği (HTML formatında)
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const mailOptions = {
        from: this.configService.get<string>('SMTP_FROM', 'Vardiya Sistemi <noreply@vardiya.com>'),
        to,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to: ${to}, messageId: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Email sending failed to: ${to}`, error.stack);
      throw error;
    }
  }

  /**
   * Test bağlantısı yapma
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email server connection established successfully');
      return true;
    } catch (error) {
      this.logger.error('Email server connection failed', error.stack);
      return false;
    }
  }
}
