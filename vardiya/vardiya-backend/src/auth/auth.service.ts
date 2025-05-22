import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { JwtPayload } from './strategies/jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private organizationsService: OrganizationsService,
    private jwtService: JwtService,
    private configService: ConfigService
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
}
