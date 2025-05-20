import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ description: 'Organizasyon adı', example: 'ABC Şirketi' })
  @IsNotEmpty({ message: 'Organizasyon adı zorunludur' })
  @IsString({ message: 'Organizasyon adı metin olmalıdır' })
  @MaxLength(255, { message: 'Organizasyon adı en fazla 255 karakter olabilir' })
  name: string;

  @ApiProperty({ description: 'Organizasyon adresi', required: false, example: 'İstanbul, Türkiye' })
  @IsOptional()
  @IsString({ message: 'Adres metin olmalıdır' })
  address?: string;

  @ApiProperty({ description: 'Organizasyon telefon numarası', required: false, example: '05551234567' })
  @IsOptional()
  @IsString({ message: 'Telefon metin olmalıdır' })
  @Length(10, 20, { message: 'Telefon numarası 10-20 karakter arasında olmalıdır' })
  phone?: string;

  @ApiProperty({ description: 'Organizasyon e-posta adresi', example: 'info@abcsirketi.com' })
  @IsNotEmpty({ message: 'E-posta adresi zorunludur' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  @MaxLength(255, { message: 'E-posta adresi en fazla 255 karakter olabilir' })
  email: string;
}
