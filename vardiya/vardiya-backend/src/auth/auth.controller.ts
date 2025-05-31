import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Kimlik Doğrulama')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kullanıcı girişi' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Giriş başarılı',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Geçersiz kimlik bilgileri',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Kullanıcı kaydı' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Kullanıcı başarıyla oluşturuldu',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Geçersiz kayıt bilgileri',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'E-posta adresi zaten kullanılıyor',
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanıcı profilini getir' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Kullanıcı profili',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Yetkilendirme hatası',
  })
  getProfile(@Request() req) {
    // JWT stratejisinden dönen kullanıcı bilgileri
    return req.user;
  }

  @Post('password-reset-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Şifre sıfırlama isteği oluşturma' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Şifre sıfırlama talimatları e-posta ile gönderildi',
  })
  async requestPasswordReset(@Body() passwordResetRequestDto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(passwordResetRequestDto);
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Şifre sıfırlama işlemi' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Şifre başarıyla sıfırlandı',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Geçersiz veya süresi dolmuş token',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Şifre sıfırlama bağlantısının süresi dolmuş',
  })
  async resetPassword(@Body() passwordResetDto: PasswordResetDto) {
    return this.authService.resetPassword(passwordResetDto);
  }
}
