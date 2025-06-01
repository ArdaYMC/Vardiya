import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Query, 
  Request,
  HttpCode,
  HttpStatus,
  Put
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ShiftResponseDto } from './dto/shift-response.dto';
import { ShiftAssignment } from './entities/shift-assignment.entity';

@ApiTags('Vardiyalar')
@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Yeni vardiya oluştur' })
  @ApiResponse({ status: 201, description: 'Vardiya başarıyla oluşturuldu', type: ShiftResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  create(@Body() createShiftDto: CreateShiftDto, @Request() req): Promise<ShiftResponseDto> {
    // Kullanıcının organizasyonId'sini DTO'ya ekle (güvenlik için)
    if (!createShiftDto.organizationId) {
      createShiftDto.organizationId = req.user.organizationId;
    }
    
    // Oluşturan kişi set edilmemişse, şu anki kullanıcı ID'sini kullan
    if (!createShiftDto.createdBy) {
      createShiftDto.createdBy = req.user.id;
    }
    
    return this.shiftsService.createShift(createShiftDto);
  }

  @Get()
  @ApiOperation({ summary: 'Vardiyaları listele' })
  @ApiQuery({ name: 'startDate', required: false, type: Date, description: 'Başlangıç tarihi filtresi' })
  @ApiQuery({ name: 'endDate', required: false, type: Date, description: 'Bitiş tarihi filtresi' })
  @ApiResponse({ status: 200, description: 'Vardiya listesi', type: [ShiftResponseDto] })
  findAll(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<ShiftResponseDto[]> {
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;
    
    // Organizasyon ID'sini kullanıcıdan al (güvenlik için)
    return this.shiftsService.findAllShifts(req.user.organizationId, startDateObj, endDateObj);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID\'ye göre vardiya getir' })
  @ApiParam({ name: 'id', description: 'Vardiya ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Vardiya başarıyla bulundu', type: ShiftResponseDto })
  @ApiResponse({ status: 404, description: 'Vardiya bulunamadı' })
  findOne(@Param('id') id: string, @Request() req): Promise<ShiftResponseDto> {
    return this.shiftsService.findShiftById(+id, req.user.organizationId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Vardiya bilgilerini kısmi güncelle' })
  @ApiParam({ name: 'id', description: 'Vardiya ID', example: 1 })
  @ApiBody({ type: UpdateShiftDto })
  @ApiResponse({ status: 200, description: 'Vardiya başarıyla güncellendi', type: ShiftResponseDto })
  @ApiResponse({ status: 404, description: 'Vardiya bulunamadı' })
  update(@Param('id') id: string, @Body() updateShiftDto: UpdateShiftDto, @Request() req): Promise<ShiftResponseDto> {
    return this.shiftsService.updateShift(+id, updateShiftDto, req.user.organizationId);
  }
  
  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Vardiya bilgilerini tam güncelle (çalışan atama dahil)' })
  @ApiParam({ name: 'id', description: 'Vardiya ID', example: 1 })
  @ApiBody({ type: UpdateShiftDto })
  @ApiResponse({ status: 200, description: 'Vardiya başarıyla güncellendi', type: ShiftResponseDto })
  @ApiResponse({ status: 404, description: 'Vardiya veya çalışan bulunamadı' })
  @ApiResponse({ status: 409, description: 'Çakışan vardiya ataması bulunmakta' })
  updateFull(@Param('id') id: string, @Body() updateShiftDto: UpdateShiftDto, @Request() req): Promise<ShiftResponseDto> {
    return this.shiftsService.updateShift(+id, updateShiftDto, req.user.organizationId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vardiya sil' })
  @ApiParam({ name: 'id', description: 'Vardiya ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Vardiya başarıyla silindi' })
  @ApiResponse({ status: 404, description: 'Vardiya bulunamadı' })
  remove(@Param('id') id: string, @Request() req): Promise<{ message: string }> {
    return this.shiftsService.removeShift(+id, req.user.organizationId);
  }
  
  @Patch(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Vardiyaya çalışan ata (basitleştirilmiş)' })
  @ApiParam({ name: 'id', description: 'Vardiya ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Vardiya ataması başarıyla yapıldı' })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  @ApiResponse({ status: 404, description: 'Vardiya veya kullanıcı bulunamadı' })
  @ApiResponse({ status: 409, description: 'Çakışan vardiya ataması bulunmakta' })
  assignEmployeeSimple(
    @Param('id') id: string,
    @Body() assignData: { employeeId: number },
    @Request() req
  ): Promise<ShiftAssignment> {
    // Frontend'den gelen basit employeeId'yi CreateShiftAssignmentDto formatına dönüştür
    const createShiftAssignmentDto = new CreateShiftAssignmentDto();
    createShiftAssignmentDto.shiftId = +id;
    createShiftAssignmentDto.userId = assignData.employeeId;
    createShiftAssignmentDto.assignedBy = req.user.id;
    
    return this.shiftsService.assignShift(createShiftAssignmentDto);
  }

  @Post(':id/assignments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Vardiyaya çalışan ata' })
  @ApiParam({ name: 'id', description: 'Vardiya ID', example: 1 })
  @ApiResponse({ status: 201, description: 'Vardiya ataması başarıyla oluşturuldu' })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  @ApiResponse({ status: 404, description: 'Vardiya veya kullanıcı bulunamadı' })
  @ApiResponse({ status: 409, description: 'Çakışan vardiya ataması bulunmakta' })
  assignEmployee(
    @Param('id') id: string,
    @Body() createShiftAssignmentDto: CreateShiftAssignmentDto,
    @Request() req
  ): Promise<ShiftAssignment> {
    // Vardiya ID'sini URL'den al
    createShiftAssignmentDto.shiftId = +id;
    
    // Atamayı yapan kişiyi şu anki kullanıcı olarak ayarla
    if (!createShiftAssignmentDto.assignedBy) {
      createShiftAssignmentDto.assignedBy = req.user.id;
    }
    
    return this.shiftsService.assignShift(createShiftAssignmentDto);
  }

  @Get(':id/assignments')
  @ApiOperation({ summary: 'Vardiyaya atanan çalışanları listele' })
  @ApiParam({ name: 'id', description: 'Vardiya ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Vardiya atama listesi' })
  findAssignmentsByShift(@Param('id') id: string): Promise<ShiftAssignment[]> {
    return this.shiftsService.findAssignmentsByShift(+id);
  }

  @Delete('assignments/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vardiya atamasını kaldır' })
  @ApiParam({ name: 'id', description: 'Vardiya atama ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Vardiya ataması başarıyla kaldırıldı' })
  @ApiResponse({ status: 404, description: 'Vardiya ataması bulunamadı' })
  removeAssignment(@Param('id') id: string): Promise<{ message: string }> {
    return this.shiftsService.removeAssignment(+id);
  }

  @Post('assignments/:id/swap')
  @ApiOperation({ summary: 'Vardiya takas isteği oluştur' })
  @ApiParam({ name: 'id', description: 'Vardiya atama ID', example: 1 })
  @ApiQuery({ name: 'targetUserId', required: true, type: Number, description: 'Takas istenen kullanıcı ID' })
  @ApiResponse({ status: 200, description: 'Vardiya takas isteği başarıyla oluşturuldu' })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  @ApiResponse({ status: 404, description: 'Vardiya ataması veya kullanıcı bulunamadı' })
  @ApiResponse({ status: 409, description: 'Çakışan vardiya ataması bulunmakta' })
  requestShiftSwap(
    @Param('id') id: string,
    @Query('targetUserId') targetUserId: string,
    @Request() req
  ): Promise<ShiftAssignment> {
    return this.shiftsService.requestShiftSwap(+id, +targetUserId, req.user.id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Kullanıcının vardiya atamalarını listele' })
  @ApiParam({ name: 'userId', description: 'Kullanıcı ID', example: 1 })
  @ApiQuery({ name: 'startDate', required: false, type: Date, description: 'Başlangıç tarihi filtresi' })
  @ApiQuery({ name: 'endDate', required: false, type: Date, description: 'Bitiş tarihi filtresi' })
  @ApiResponse({ status: 200, description: 'Kullanıcının vardiya atama listesi' })
  findUserAssignments(
    @Param('userId') userId: string,
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<ShiftAssignment[]> {
    // ADMIN veya MANAGER değilse, sadece kendi atamalarını görebilir
    if (req.user.role === UserRole.EMPLOYEE && req.user.id !== +userId) {
      userId = req.user.id.toString();
    }
    
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;
    
    return this.shiftsService.findAssignmentsByUser(+userId, startDateObj, endDateObj);
  }
}
