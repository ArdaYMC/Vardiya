import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationChannel } from '../notifications/entities/notification.entity';
import { JwtPayload } from './strategies/jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private organizationsService: OrganizationsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService
  ) {}

  /**
   * Kullanıcı girişi ve token üretimi
   * @param loginDto Giriş bilgileri
   * @returns Token ve kullanıcı bilgileri
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // E-posta ile kullanıcıyı bul
    const user = await this.usersService.findByEmail(loginDto.email);
    
    if (!user) {
      throw new UnauthorizedException('Geçersiz e-posta adresi veya şifre');
    }

    // Şifre doğrulama
    const isPasswordValid = await this.usersService.comparePasswords(
      loginDto.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Geçersiz e-posta adresi veya şifre');
    }

    // JWT token oluştur
    const accessToken = this.generateToken(user.id, user.email, user.organizationId, user.role);
    
    // Response DTO oluştur ve dön
    return new AuthResponseDto(accessToken, new UserResponseDto(user));
  }

  /**
   * Yeni kullanıcı kaydı ve token üretimi
   * @param registerDto Kayıt bilgileri
   * @returns Token ve kullanıcı bilgileri
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    let organizationId: number;
    
    // Yeni organizasyon mu, mevcut organizasyon mu kontrol et
    if (registerDto.organizationName) {
      // Yeni organizasyon oluştur
      const newOrg = await this.organizationsService.create({
        name: registerDto.organizationName,
        email: `info@${registerDto.organizationName.toLowerCase().replace(/\s+/g, '')}.com` // Organizasyon adından geçici e-posta oluştur
      });
      organizationId = newOrg.id;
    } else if (registerDto.organizationId) {
      // Mevcut organizasyon var mı kontrol et
      try {
        await this.organizationsService.findOne(registerDto.organizationId);
        organizationId = registerDto.organizationId;
      } catch (error) {
        throw new BadRequestException('Geçersiz organizasyon ID');
      }
    } else {
      throw new BadRequestException('Organizasyon bilgisi gereklidir (ID veya isim)');
    }
    
    // organizationId'yi DTO'ya ekle
    const userCreateDto = {
      ...registerDto,
      organizationId // Her durumda doğru organizationId kullan
    };

    // Kullanıcıyı oluştur
    const newUser = await this.usersService.create(userCreateDto);

    // JWT token oluştur
    const accessToken = this.generateToken(
      newUser.id, 
      newUser.email, 
      organizationId, 
      registerDto.role || 'EMPLOYEE'
    );

    // Response DTO oluştur ve dön
    return new AuthResponseDto(accessToken, newUser);
  }

  /**
   * JWT token oluşturur
   * @param userId Kullanıcı ID
   * @param email Kullanıcı e-posta adresi
   * @param organizationId Organizasyon ID
   * @param role Kullanıcı rolü
   * @returns JWT token
   */
  private generateToken(userId: number, email: string, organizationId: number, role: string): string {
    const payload: JwtPayload = {
      sub: userId,
      email: email,
      organizationId: organizationId,
      role: role,
    };

    // Token'i oluştur ve dön
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET', 'varsayilan_gizli_anahtar'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h'),
    });
  }

  /**
   * Token'dan kullanıcı bilgilerini çıkarır
   * @param token JWT token
   * @returns Payload içeriği
   */
  decodeToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET', 'varsayilan_gizli_anahtar'),
      }) as JwtPayload;
    } catch (error) {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş token');
    }
  }

  /**
   * Şifre sıfırlama isteği oluşturur ve e-posta gönderir
   * @param passwordResetRequestDto Şifre sıfırlama istek verileri
   * @returns İşlem sonucu
   */
  async requestPasswordReset(passwordResetRequestDto: PasswordResetRequestDto): Promise<{ success: boolean; message: string }> {
    const user = await this.usersService.findByEmail(passwordResetRequestDto.email);
    
    if (!user) {
      // Kullanıcı bulunamasa bile aynı yanıtı ver (güvenlik amacıyla)
      return {
        success: true,
        message: 'Şifre sıfırlama talimatları e-posta adresinize gönderildi.'
      };
    }
    
    // Rastgele token oluştur
    const resetToken = randomBytes(32).toString('hex');
    
    // Token geçerlilik süresi (1 saat)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Token ve son kullanma tarihini kullanıcı kaydına ekle
    await this.usersService.savePasswordResetToken(user.id, resetToken, expiresAt);
    
    // Uygulama URL'sini al
    const appUrl = this.configService.get('FRONTEND_URL', 'http://localhost:4200');
    
    // E-posta bildirimini oluştur
    await this.notificationsService.create({
      type: NotificationType.PASSWORD_RESET,
      title: 'Şifre Sıfırlama Talebi',
      content: `Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın. Bu bağlantı 1 saat boyunca geçerlidir:\n\n${appUrl}/auth/reset-password?token=${resetToken}`,
      recipientId: user.id,
      organizationId: user.organizationId,
      channel: NotificationChannel.EMAIL,
      metadata: {
        resetToken,
        expiresAt: expiresAt.toISOString(),
      }
    });
    
    return {
      success: true,
      message: 'Şifre sıfırlama talimatları e-posta adresinize gönderildi.'
    };
  }

  /**
   * Şifre sıfırlama işlemini tamamlar
   * @param passwordResetDto Şifre sıfırlama verileri
   * @returns İşlem sonucu
   */
  async resetPassword(passwordResetDto: PasswordResetDto): Promise<{ success: boolean; message: string }> {
    // Token ile kullanıcıyı bul
    const user = await this.usersService.findUserByResetToken(passwordResetDto.token);
    
    if (!user) {
      throw new NotFoundException('Geçersiz veya süresi dolmuş token');
    }
    
    // Token geçerlilik süresini kontrol et
    if (new Date(user.resetTokenExpires) < new Date()) {
      throw new BadRequestException('Şifre sıfırlama bağlantısının süresi dolmuş');
    }
    
    // Yeni şifreyi hashleyip kaydet
    await this.usersService.updatePassword(user.id, passwordResetDto.password);
    
    // Token bilgilerini temizle
    await this.usersService.clearPasswordResetToken(user.id);
    
    return {
      success: true,
      message: 'Şifreniz başarıyla güncellendi'
    };
  }
}
