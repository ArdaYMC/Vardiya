import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { OrganizationResponseDto } from './dto/organization-response.dto';

@ApiTags('Organizasyonlar')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Organizasyon oluştur' })
  @ApiResponse({ status: 201, description: 'Organizasyon başarıyla oluşturuldu', type: OrganizationResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  @ApiResponse({ status: 409, description: 'Bu e-posta adresi zaten kullanılıyor' })
  create(@Body() createOrganizationDto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Tüm organizasyonları listele' })
  @ApiResponse({ status: 200, description: 'Organizasyon listesi', type: [OrganizationResponseDto] })
  findAll(): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID\'ye göre organizasyon getir' })
  @ApiParam({ name: 'id', description: 'Organizasyon ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Organizasyon başarıyla bulundu', type: OrganizationResponseDto })
  @ApiResponse({ status: 404, description: 'Organizasyon bulunamadı' })
  findOne(@Param('id') id: string): Promise<OrganizationResponseDto> {
    return this.organizationsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Organizasyon bilgilerini güncelle' })
  @ApiParam({ name: 'id', description: 'Organizasyon ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Organizasyon başarıyla güncellendi', type: OrganizationResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  @ApiResponse({ status: 404, description: 'Organizasyon bulunamadı' })
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.update(+id, updateOrganizationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Organizasyon sil' })
  @ApiParam({ name: 'id', description: 'Organizasyon ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Organizasyon başarıyla silindi' })
  @ApiResponse({ status: 404, description: 'Organizasyon bulunamadı' })
  @ApiResponse({ status: 409, description: 'Organizasyona bağlı kullanıcılar var' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.organizationsService.remove(+id);
  }
}
