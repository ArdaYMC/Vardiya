import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetDto {
  @ApiProperty({
    description: 'Şifre sıfırlama token\'ı',
    example: 'abc123def456',
  })
  @IsString({ message: 'Token geçerli bir metin olmalıdır' })
  @IsNotEmpty({ message: 'Token gereklidir' })
  token: string;

  @ApiProperty({
    description: 'Yeni şifre',
    example: 'GucluSifre123!',
  })
  @IsString({ message: 'Şifre geçerli bir metin olmalıdır' })
  @IsNotEmpty({ message: 'Şifre gereklidir' })
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Şifre en az bir büyük harf, bir küçük harf ve bir rakam veya özel karakter içermelidir',
  })
  password: string;
}
