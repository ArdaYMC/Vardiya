import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ description: 'Organizasyon ID', example: 1 })
  @IsNumber({}, { message: 'Organizasyon ID sayı olmalıdır' })
  organizationId: number;

  @ApiProperty({ description: 'E-posta adresi', example: 'kullanici@ornek.com' })
  @IsNotEmpty({ message: 'E-posta adresi zorunludur' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  @MaxLength(255, { message: 'E-posta adresi en fazla 255 karakter olabilir' })
  email: string;

  @ApiProperty({ description: 'Şifre', example: 'Sifre123!' })
  @IsNotEmpty({ message: 'Şifre zorunludur' })
  @Length(8, 50, { message: 'Şifre 8-50 karakter arasında olmalıdır' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir',
  })
  password: string;

  @ApiProperty({ description: 'Ad', example: 'Ahmet' })
  @IsNotEmpty({ message: 'Ad zorunludur' })
  @IsString({ message: 'Ad metin olmalıdır' })
  @MaxLength(100, { message: 'Ad en fazla 100 karakter olabilir' })
  firstName: string;

  @ApiProperty({ description: 'Soyad', example: 'Yılmaz' })
  @IsNotEmpty({ message: 'Soyad zorunludur' })
  @IsString({ message: 'Soyad metin olmalıdır' })
  @MaxLength(100, { message: 'Soyad en fazla 100 karakter olabilir' })
  lastName: string;

  @ApiProperty({ description: 'Kullanıcı rolü', enum: UserRole, default: UserRole.EMPLOYEE, example: UserRole.EMPLOYEE })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Geçerli bir rol seçiniz' })
  role?: UserRole;

  @ApiProperty({ description: 'Telefon numarası', required: false, example: '05551234567' })
  @IsOptional()
  @IsString({ message: 'Telefon metin olmalıdır' })
  @Length(10, 20, { message: 'Telefon numarası 10-20 karakter arasında olmalıdır' })
  phone?: string;
}
