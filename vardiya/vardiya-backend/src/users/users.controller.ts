import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus, Query, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserResponseDto } from './dto/user-response.dto';
import { UserRole } from './entities/user.entity';

@ApiTags('Kullanıcılar')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Kullanıcı oluştur' })
  @ApiResponse({ status: 201, description: 'Kullanıcı başarıyla oluşturuldu', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  @ApiResponse({ status: 409, description: 'Bu e-posta adresi zaten kullanılıyor' })
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Kullanıcıları listele' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Organizasyon ID filtresi' })
  @ApiResponse({ status: 200, description: 'Kullanıcı listesi', type: [UserResponseDto] })
  findAll(@Query('organizationId') organizationId?: string): Promise<UserResponseDto[]> {
    return this.usersService.findAll(organizationId ? +organizationId : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID\'ye göre kullanıcı getir' })
  @ApiParam({ name: 'id', description: 'Kullanıcı ID', example: 1 })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Organizasyon ID filtresi' })
  @ApiResponse({ status: 200, description: 'Kullanıcı başarıyla bulundu', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı' })
  findOne(
    @Param('id') id: string,
    @Query('organizationId') organizationId?: string
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(+id, organizationId ? +organizationId : undefined);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Kullanıcı bilgilerini güncelle' })
  @ApiParam({ name: 'id', description: 'Kullanıcı ID', example: 1 })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Organizasyon ID filtresi' })
  @ApiResponse({ status: 200, description: 'Kullanıcı başarıyla güncellendi', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Query('organizationId') organizationId?: string
  ): Promise<UserResponseDto> {
    return this.usersService.update(+id, updateUserDto, organizationId ? +organizationId : undefined);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kullanıcı sil' })
  @ApiParam({ name: 'id', description: 'Kullanıcı ID', example: 1 })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Organizasyon ID filtresi' })
  @ApiResponse({ status: 200, description: 'Kullanıcı başarıyla silindi' })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı' })
  @ApiResponse({ status: 409, description: 'Son admin kullanıcısı silinemez' })
  remove(
    @Param('id') id: string,
    @Query('organizationId') organizationId?: string
  ): Promise<{ message: string }> {
    return this.usersService.remove(+id, organizationId ? +organizationId : undefined);
  }
}
