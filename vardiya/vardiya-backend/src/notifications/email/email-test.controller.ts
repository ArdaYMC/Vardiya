import { Controller, Post, Body, Get } from '@nestjs/common';
import { EmailService } from './email.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

class SendTestEmailDto {
  to: string;
  subject?: string;
  content?: string;
}

@ApiTags('E-posta Testi')
@Controller('admin/email-test')
export class EmailTestController {
  constructor(private readonly emailService: EmailService) {}

  @Get('verify')
  @ApiOperation({ summary: 'E-posta bağlantısını doğrula' })
  @ApiResponse({
    status: 200,
    description: 'E-posta sunucusu bağlantı durumu',
    type: Boolean,
  })
  async verifyConnection() {
    const isConnected = await this.emailService.verifyConnection();
    return {
      success: isConnected,
      message: isConnected 
        ? 'E-posta sunucusuna başarıyla bağlanıldı' 
        : 'E-posta sunucusuna bağlantı başarısız oldu',
    };
  }

  @Post('send')
  @ApiOperation({ summary: 'Test e-postası gönder' })
  @ApiResponse({
    status: 200,
    description: 'E-posta gönderildi',
  })
  @ApiResponse({
    status: 500,
    description: 'E-posta gönderilemedi',
  })
  async sendTestEmail(@Body() sendTestEmailDto: SendTestEmailDto) {
    try {
      // Varsayılan değerleri kullan, eğer sağlanmamışsa
      const subject = sendTestEmailDto.subject || 'Vardiya Sistemi - Test E-postası';
      const content = sendTestEmailDto.content || 
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333;">Vardiya Sistemi Test E-postası</h2>
          <p style="color: #555; line-height: 1.5;">
            Bu bir test e-postasıdır. E-posta gönderimi başarıyla çalışmaktadır.
          </p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee; color: #777; font-size: 12px;">
            Bu e-posta, Vardiya Sisteminden otomatik olarak gönderilmiştir.
          </p>
        </div>`;

      await this.emailService.sendEmail(
        sendTestEmailDto.to,
        subject,
        content
      );

      return {
        success: true,
        message: `Test e-postası "${sendTestEmailDto.to}" adresine başarıyla gönderildi`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'E-posta gönderimi başarısız oldu',
        error: error.message,
      };
    }
  }
}
