import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetRequestDto {
  @ApiProperty({
    description: 'Kullanıcının e-posta adresi',
    example: 'kullanici@ornek.com',
  })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  @IsNotEmpty({ message: 'E-posta adresi gereklidir' })
  email: string;
}
