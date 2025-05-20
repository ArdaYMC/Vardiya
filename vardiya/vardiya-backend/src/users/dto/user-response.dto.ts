import { ApiProperty } from '@nestjs/swagger';
import { User, UserRole } from '../entities/user.entity';
import { Exclude, Expose, Transform } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({ description: 'Kullanıcı ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Organizasyon ID', example: 1 })
  organizationId: number;

  @ApiProperty({ description: 'E-posta adresi', example: 'kullanici@ornek.com' })
  email: string;

  @ApiProperty({ description: 'Ad', example: 'Ahmet' })
  firstName: string;

  @ApiProperty({ description: 'Soyad', example: 'Yılmaz' })
  lastName: string;

  @ApiProperty({ description: 'Tam ad', example: 'Ahmet Yılmaz' })
  @Expose()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @ApiProperty({ description: 'Kullanıcı rolü', enum: UserRole, example: UserRole.EMPLOYEE })
  role: UserRole;

  @ApiProperty({ description: 'Telefon numarası', example: '05551234567' })
  phone: string;

  @ApiProperty({ description: 'Oluşturulma tarihi', example: '2023-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Güncelleme tarihi', example: '2023-01-01T00:00:00Z' })
  updatedAt: Date;

  @Exclude()
  password: string;

  @Exclude()
  organization: any;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
