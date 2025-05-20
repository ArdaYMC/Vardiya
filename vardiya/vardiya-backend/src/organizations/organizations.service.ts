import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
  ) {}

  /**
   * Yeni bir organizasyon oluşturur
   * @param createOrganizationDto Organizasyon verileri
   * @returns Oluşturulan organizasyon
   */
  async create(createOrganizationDto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    // E-posta adresiyle kayıtlı başka bir organizasyon var mı kontrol et
    const existingOrg = await this.organizationsRepository.findOne({
      where: { email: createOrganizationDto.email }
    });

    if (existingOrg) {
      throw new ConflictException('Bu e-posta adresi ile kayıtlı bir organizasyon zaten var');
    }

    // Yeni organizasyon oluştur
    const organization = this.organizationsRepository.create(createOrganizationDto);
    const savedOrg = await this.organizationsRepository.save(organization);
    
    return new OrganizationResponseDto(savedOrg);
  }

  /**
   * Tüm organizasyonları listeler
   * @returns Organizasyon listesi
   */
  async findAll(): Promise<OrganizationResponseDto[]> {
    const organizations = await this.organizationsRepository.find();
    return organizations.map(org => new OrganizationResponseDto(org));
  }

  /**
   * ID'ye göre organizasyon bulur
   * @param id Organizasyon ID
   * @returns Bulunan organizasyon
   */
  async findOne(id: number): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!organization) {
      throw new NotFoundException(`ID: ${id} olan organizasyon bulunamadı`);
    }

    return new OrganizationResponseDto(organization);
  }

  /**
   * Organizasyon bilgilerini günceller
   * @param id Organizasyon ID
   * @param updateOrganizationDto Güncellenecek veriler
   * @returns Güncellenmiş organizasyon
   */
  async update(id: number, updateOrganizationDto: UpdateOrganizationDto): Promise<OrganizationResponseDto> {
    // Organizasyonun var olduğunu kontrol et
    const organization = await this.organizationsRepository.findOne({ where: { id } });
    
    if (!organization) {
      throw new NotFoundException(`ID: ${id} olan organizasyon bulunamadı`);
    }

    // Email değişiyorsa, yeni email'in başka bir organizasyonda kullanılmadığını kontrol et
    if (updateOrganizationDto.email && updateOrganizationDto.email !== organization.email) {
      const existingOrg = await this.organizationsRepository.findOne({
        where: { email: updateOrganizationDto.email }
      });

      if (existingOrg) {
        throw new ConflictException('Bu e-posta adresi ile kayıtlı başka bir organizasyon zaten var');
      }
    }

    // Organizasyonu güncelle
    await this.organizationsRepository.update(id, updateOrganizationDto);
    
    // Güncellenmiş veriyi getir
    const updatedOrganization = await this.organizationsRepository.findOne({ where: { id } });
    
    if (!updatedOrganization) {
      throw new NotFoundException(`Güncellenmiş organizasyon bulunamadı`);
    }
    
    return new OrganizationResponseDto(updatedOrganization);
  }

  /**
   * Organizasyonu siler
   * @param id Organizasyon ID
   * @returns Silme işleminin başarılı olduğunu belirten mesaj
   */
  async remove(id: number): Promise<{ message: string }> {
    const organization = await this.organizationsRepository.findOne({ 
      where: { id },
      relations: ['users']
    });
    
    if (!organization) {
      throw new NotFoundException(`ID: ${id} olan organizasyon bulunamadı`);
    }

    // Organizasyona bağlı kullanıcılar varsa silme işlemi yapma
    if (organization.users && organization.users.length > 0) {
      throw new ConflictException(
        'Bu organizasyona bağlı kullanıcılar var. Önce kullanıcıları silmelisiniz.'
      );
    }

    await this.organizationsRepository.remove(organization);
    return { message: 'Organizasyon başarıyla silindi' };
  }
}
