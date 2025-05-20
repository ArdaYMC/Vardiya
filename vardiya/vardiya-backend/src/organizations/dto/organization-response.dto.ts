import { ApiProperty } from '@nestjs/swagger';
import { Organization } from '../entities/organization.entity';
import { Exclude, Expose, Transform } from 'class-transformer';

export class OrganizationResponseDto {
  @ApiProperty({ description: 'Organizasyon ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Organizasyon adı', example: 'ABC Şirketi' })
  name: string;

  @ApiProperty({ description: 'Organizasyon adresi', example: 'İstanbul, Türkiye' })
  address: string;

  @ApiProperty({ description: 'Organizasyon telefon numarası', example: '05551234567' })
  phone: string;

  @ApiProperty({ description: 'Organizasyon e-posta adresi', example: 'info@abcsirketi.com' })
  email: string;

  @ApiProperty({ description: 'Oluşturulma tarihi', example: '2023-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Güncelleme tarihi', example: '2023-01-01T00:00:00Z' })
  updatedAt: Date;

  @Exclude()
  users: any[];

  constructor(partial: Partial<Organization>) {
    Object.assign(this, partial);
  }
}
