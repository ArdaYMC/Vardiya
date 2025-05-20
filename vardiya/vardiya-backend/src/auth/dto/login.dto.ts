import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Kullanıcı e-posta adresi', example: 'kullanici@ornek.com' })
  @IsNotEmpty({ message: 'E-posta adresi zorunludur' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  email: string;

  @ApiProperty({ description: 'Kullanıcı şifresi', example: 'Sifre123!' })
  @IsNotEmpty({ message: 'Şifre zorunludur' })
  @IsString({ message: 'Şifre metin olmalıdır' })
  password: string;
}
