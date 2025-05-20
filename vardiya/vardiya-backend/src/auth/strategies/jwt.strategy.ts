import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * JWT token payload arayüzü
 */
export interface JwtPayload {
  sub: number;        // Kullanıcı ID
  email: string;      // Kullanıcı e-posta adresi
  organizationId: number; // Organizasyon ID
  role: string;       // Kullanıcı rolü
  iat?: number;       // Token oluşturma zamanı
  exp?: number;       // Token son kullanma zamanı
}

/**
 * JWT stratejisi, gelen JWT tokenlarını doğrular ve kullanıcı bilgilerini çıkarır
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,  // Süresi dolmuş tokenları reddet
      secretOrKey: configService.get('JWT_SECRET', 'varsayilan_gizli_anahtar'),
    });
  }

  /**
   * JWT payload doğrulama ve kullanıcı bilgilerini çıkarma
   * @param payload JWT içeriği
   * @returns Doğrulanmış kullanıcı verisi
   */
  async validate(payload: JwtPayload) {
    const { sub: id, organizationId } = payload;
    
    // Kullanıcının varlığını ve organizasyon eşleşmesini kontrol et
    const user = await this.usersRepository.findOne({ 
      where: { id, organizationId },
      relations: ['organization']
    });

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı veya yetkiniz yok');
    }

    // Bu nesne, request.user içinde erişilebilir olacak
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      organizationName: user.organization?.name,
      role: user.role,
    };
  }
}