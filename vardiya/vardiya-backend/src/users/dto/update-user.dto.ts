import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['organizationId'] as const)) {
  @ApiProperty({ description: 'Mevcut şifre (şifre değişikliği için)', required: false, example: 'EskiSifre123!' })
  @IsOptional()
  @IsString({ message: 'Mevcut şifre metin olmalıdır' })
  currentPassword?: string;

  @ApiProperty({ description: 'Yeni şifre', required: false, example: 'YeniSifre123!' })
  @IsOptional()
  @Length(8, 50, { message: 'Şifre 8-50 karakter arasında olmalıdır' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir',
  })
  password?: string;
}
