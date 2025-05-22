import { Injectable, NotFoundException, ConflictException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Shift, ShiftStatus } from './entities/shift.entity';
import { ShiftAssignment, AssignmentStatus } from './entities/shift-assignment.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { ShiftResponseDto } from './dto/shift-response.dto';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private shiftsRepository: Repository<Shift>,
    @InjectRepository(ShiftAssignment)
    private shiftAssignmentsRepository: Repository<ShiftAssignment>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Yeni bir vardiya oluşturur
   * @param createShiftDto Vardiya verileri
   * @returns Oluşturulan vardiya
   */
  async createShift(createShiftDto: CreateShiftDto): Promise<ShiftResponseDto> {
    // Tarihleri kontrol et
    const startTime = new Date(createShiftDto.startTime);
    const endTime = new Date(createShiftDto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('Başlangıç zamanı bitiş zamanından önce olmalıdır');
    }

    // Kullanıcı var mı kontrol et
    const creator = await this.usersRepository.findOne({ 
      where: { 
        id: createShiftDto.createdBy,
        organizationId: createShiftDto.organizationId
      } 
    });

    if (!creator) {
      throw new NotFoundException('Kullanıcı bulunamadı veya bu organizasyona ait değil');
    }

    // Yeni vardiya oluştur
    const shift = this.shiftsRepository.create({
      ...createShiftDto,
      startTime,
      endTime
    });

    const savedShift = await this.shiftsRepository.save(shift);
    return new ShiftResponseDto(savedShift);
  }

  /**
   * Tüm vardiyaları listeler
   * @param organizationId Organizasyon filtresi
   * @param startDate Başlangıç tarihi filtresi
   * @param endDate Bitiş tarihi filtresi
   * @returns Vardiya listesi
   */
  async findAllShifts(
    organizationId: number, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<ShiftResponseDto[]> {
    let whereClause: any = { organizationId };
    
    // Tarih filtrelemesi
    if (startDate || endDate) {
      whereClause.startTime = {};
      
      if (startDate) {
        whereClause.startTime = MoreThanOrEqual(startDate);
      }
      
      if (endDate) {
        whereClause.endTime = LessThanOrEqual(endDate);
      }
    }
    
    const shifts = await this.shiftsRepository.find({
      where: whereClause,
      order: { startTime: 'ASC' }
    });
    
    return shifts.map(shift => new ShiftResponseDto(shift));
  }

  /**
   * ID'ye göre vardiya bulur
   * @param id Vardiya ID
   * @param organizationId Organizasyon filtresi (opsiyonel)
   * @returns Bulunan vardiya
   */
  async findShiftById(id: number, organizationId?: number): Promise<ShiftResponseDto> {
    const whereClause: any = { id };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }
    
    const shift = await this.shiftsRepository.findOne({
      where: whereClause,
      relations: ['creator', 'organization']
    });

    if (!shift) {
      throw new NotFoundException(`ID: ${id} olan vardiya bulunamadı`);
    }

    return new ShiftResponseDto(shift);
  }

  /**
   * Vardiya bilgilerini günceller
   * @param id Vardiya ID
   * @param updateShiftDto Güncellenecek veriler
   * @param organizationId Organizasyon filtresi (opsiyonel)
   * @returns Güncellenmiş vardiya
   */
  async updateShift(
    id: number, 
    updateShiftDto: UpdateShiftDto, 
    organizationId?: number
  ): Promise<ShiftResponseDto> {
    // Vardiya var mı kontrol et
    const whereClause: any = { id };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }
    
    const shift = await this.shiftsRepository.findOne({ where: whereClause });
    
    if (!shift) {
      throw new NotFoundException(`ID: ${id} olan vardiya bulunamadı`);
    }
    
    // Tarih güncellemesi varsa kontrol et
    if (updateShiftDto.startTime || updateShiftDto.endTime) {
      const startTime = updateShiftDto.startTime ? new Date(updateShiftDto.startTime) : shift.startTime;
      const endTime = updateShiftDto.endTime ? new Date(updateShiftDto.endTime) : shift.endTime;
      
      if (startTime >= endTime) {
        throw new BadRequestException('Başlangıç zamanı bitiş zamanından önce olmalıdır');
      }
    }

    // Durumu CANCELLED olarak güncelliyorsa, ilgili atamaları da güncelle
    if (updateShiftDto.status === ShiftStatus.CANCELLED && shift.status !== ShiftStatus.CANCELLED) {
      // İlgili atamaları da iptal et
      await this.shiftAssignmentsRepository.update(
        { shiftId: id, status: AssignmentStatus.ASSIGNED },
        { status: AssignmentStatus.REJECTED }
      );
    }
    
    // Değişiklikleri tespit et ve bildirim içeriği oluştur
    let changes: string[] = [];
    if (updateShiftDto.startTime && new Date(updateShiftDto.startTime).getTime() !== shift.startTime.getTime()) {
      changes.push(`Başlangıç zamanı: ${shift.startTime.toLocaleString()} -> ${new Date(updateShiftDto.startTime).toLocaleString()}`);
    }
    if (updateShiftDto.endTime && new Date(updateShiftDto.endTime).getTime() !== shift.endTime.getTime()) {
      changes.push(`Bitiş zamanı: ${shift.endTime.toLocaleString()} -> ${new Date(updateShiftDto.endTime).toLocaleString()}`);
    }
    if (updateShiftDto.title && updateShiftDto.title !== shift.title) {
      changes.push(`Başlık: ${shift.title} -> ${updateShiftDto.title}`);
    }
    if (updateShiftDto.location && updateShiftDto.location !== shift.location) {
      changes.push(`Lokasyon: ${shift.location || 'Belirtilmemiş'} -> ${updateShiftDto.location}`);
    }
    if (updateShiftDto.status && updateShiftDto.status !== shift.status) {
      changes.push(`Durum: ${shift.status} -> ${updateShiftDto.status}`);
    }

    // Vardiyayı güncelle
    await this.shiftsRepository.update(id, {
      ...updateShiftDto,
      startTime: updateShiftDto.startTime ? new Date(updateShiftDto.startTime) : undefined,
      endTime: updateShiftDto.endTime ? new Date(updateShiftDto.endTime) : undefined
    });
    
    // Güncellenmiş veriyi getir
    const updatedShift = await this.shiftsRepository.findOne({ where: { id } });
    
    if (!updatedShift) {
      throw new NotFoundException(`Güncellenmiş vardiya bulunamadı`);
    }
    
    // Atanmış çalışanlara bildirim gönder
    if (changes.length > 0) {
      const changesText = changes.join(', ');
      
      // Bu vardiyaya atanmış tüm çalışanları bul
      const assignments = await this.shiftAssignmentsRepository.find({
        where: { shiftId: id, status: AssignmentStatus.ASSIGNED },
        select: ['userId']
      });
      
      if (assignments.length > 0) {
        const userIds = assignments.map(a => a.userId);
        
        // Toplu bildirim gönder
        await this.notificationsService.createShiftUpdateNotifications(
          id,
          updatedShift.title,
          changesText,
          userIds,
          updatedShift.organizationId
        );
      }
    }
    
    return new ShiftResponseDto(updatedShift);
  }

  /**
   * Vardiyayı siler
   * @param id Vardiya ID
   * @param organizationId Organizasyon filtresi (opsiyonel)
   * @returns Silme işleminin başarılı olduğunu belirten mesaj
   */
  async removeShift(id: number, organizationId?: number): Promise<{ message: string }> {
    const whereClause: any = { id };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }
    
    const shift = await this.shiftsRepository.findOne({ where: whereClause });
    
    if (!shift) {
      throw new NotFoundException(`ID: ${id} olan vardiya bulunamadı`);
    }

    // Aktif atamaları var mı kontrol et
    const activeAssignments = await this.shiftAssignmentsRepository.count({
      where: {
        shiftId: id,
        status: AssignmentStatus.ACCEPTED
      }
    });

    if (activeAssignments > 0) {
      throw new ConflictException(
        `Bu vardiyaya atanmış ${activeAssignments} aktif çalışan var. Önce atamaları kaldırın veya durumu "CANCELLED" olarak güncelleyin.`
      );
    }

    await this.shiftsRepository.remove(shift);
    return { message: 'Vardiya başarıyla silindi' };
  }

  /**
   * Çalışana vardiya atar
   * @param createShiftAssignmentDto Vardiya atama verileri
   * @returns Oluşturulan vardiya ataması
   */
  async assignShift(createShiftAssignmentDto: CreateShiftAssignmentDto): Promise<ShiftAssignment> {
    const { shiftId, userId, assignedBy } = createShiftAssignmentDto;
    
    // Vardiya var mı kontrol et
    const shift = await this.shiftsRepository.findOne({ where: { id: shiftId } });
    
    if (!shift) {
      throw new NotFoundException(`ID: ${shiftId} olan vardiya bulunamadı`);
    }
    
    // Vardiya iptal edilmiş mi kontrol et
    if (shift.status === ShiftStatus.CANCELLED) {
      throw new BadRequestException('İptal edilmiş vardiyaya atama yapılamaz');
    }
    
    // Kullanıcı var mı kontrol et
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException(`ID: ${userId} olan kullanıcı bulunamadı`);
    }
    
    // Kullanıcının organizasyonu vardiya organizasyonu ile eşleşiyor mu kontrol et
    if (user.organizationId !== shift.organizationId) {
      throw new BadRequestException('Kullanıcı bu vardiyayı oluşturan organizasyona ait değil');
    }
    
    // Atamayı yapan kişi var mı kontrol et
    const assigner = await this.usersRepository.findOne({ where: { id: assignedBy } });
    
    if (!assigner) {
      throw new NotFoundException(`ID: ${assignedBy} olan kullanıcı bulunamadı`);
    }
    
    // Kullanıcının çakışan başka vardiyası var mı kontrol et
    const conflictingAssignments = await this.findConflictingAssignments(userId, shift.startTime, shift.endTime);
    
    if (conflictingAssignments.length > 0) {
      throw new ConflictException(
        'Kullanıcının bu zaman diliminde çakışan vardiya ataması bulunmaktadır'
      );
    }
    
    // Vardiyada yer var mı kontrol et
    const currentAssignmentCount = await this.shiftAssignmentsRepository.count({
      where: {
        shiftId,
        status: AssignmentStatus.ASSIGNED
      }
    });
    
    if (shift.maxAllowedEmployees && currentAssignmentCount >= shift.maxAllowedEmployees) {
      throw new BadRequestException('Vardiya maksimum çalışan sayısına ulaşmıştır');
    }
    
    // Daha önce atama yapılmış mı kontrol et
    const existingAssignment = await this.shiftAssignmentsRepository.findOne({
      where: {
        shiftId,
        userId
      }
    });
    
    if (existingAssignment) {
      throw new ConflictException('Bu kullanıcı zaten bu vardiyaya atanmış');
    }
    
    // Vardiya ataması oluştur
    const shiftAssignment = this.shiftAssignmentsRepository.create({
      ...createShiftAssignmentDto,
      status: createShiftAssignmentDto.status || AssignmentStatus.ASSIGNED
    });
    
    const savedAssignment = await this.shiftAssignmentsRepository.save(shiftAssignment);
    
    // Bildirim gönder
    await this.notificationsService.createShiftAssignmentNotification(
      shift.id,
      shift.title,
      shift.startTime,
      userId,
      shift.organizationId
    );
    
    return savedAssignment;
  }

  /**
   * Vardiya atamasını kaldırır
   * @param assignmentId Atama ID
   * @returns Silme işleminin başarılı olduğunu belirten mesaj
   */
  async removeAssignment(assignmentId: number): Promise<{ message: string }> {
    const assignment = await this.shiftAssignmentsRepository.findOne({
      where: { id: assignmentId },
      relations: ['shift']
    });
    
    if (!assignment) {
      throw new NotFoundException(`ID: ${assignmentId} olan vardiya ataması bulunamadı`);
    }
    
    // Vardiya başladıysa atama iptal edilemez, sadece durumu değiştirilebilir
    const now = new Date();
    if (assignment.shift && assignment.shift.startTime <= now) {
      throw new BadRequestException('Başlamış bir vardiyadan çalışan çıkarılamaz');
    }
    
    await this.shiftAssignmentsRepository.remove(assignment);
    return { message: 'Vardiya ataması başarıyla kaldırıldı' };
  }

  /**
   * Vardiya takası isteği oluşturur
   * @param assignmentId Mevcut atama ID
   * @param targetUserId Takas istenen kullanıcı ID
   * @param requestingUserId İsteği yapan kullanıcı ID
   * @returns Güncellenen atama
   */
  async requestShiftSwap(
    assignmentId: number,
    targetUserId: number,
    requestingUserId: number
  ): Promise<ShiftAssignment> {
    // Atama var mı kontrol et
    const assignment = await this.shiftAssignmentsRepository.findOne({
      where: { id: assignmentId },
      relations: ['shift', 'user']
    });
    
    if (!assignment) {
      throw new NotFoundException(`ID: ${assignmentId} olan vardiya ataması bulunamadı`);
    }
    
    // Atama isteği yapan kullanıcıya mı ait kontrol et
    if (assignment.userId !== requestingUserId) {
      throw new BadRequestException('Sadece kendi vardiya atamanız için takas isteği oluşturabilirsiniz');
    }
    
    // Hedef kullanıcı var mı kontrol et
    const targetUser = await this.usersRepository.findOne({ where: { id: targetUserId } });
    
    if (!targetUser) {
      throw new NotFoundException(`ID: ${targetUserId} olan kullanıcı bulunamadı`);
    }
    
    // Kullanıcılar aynı organizasyonda mı kontrol et
    if (assignment.user.organizationId !== targetUser.organizationId) {
      throw new BadRequestException('Takas istenen kullanıcı aynı organizasyonda olmalıdır');
    }
    
    // Hedef kullanıcının çakışan vardiyası var mı kontrol et
    const conflictingAssignments = await this.findConflictingAssignments(
      targetUserId,
      assignment.shift.startTime,
      assignment.shift.endTime
    );
    
    if (conflictingAssignments.length > 0) {
      throw new ConflictException(
        'Takas istenen kullanıcının bu zaman diliminde çakışan vardiya ataması bulunmaktadır'
      );
    }
    
    // Takas isteği güncelle
    assignment.status = AssignmentStatus.PENDING_SWAP;
    assignment.swapRequestedWith = targetUserId;
    
    return this.shiftAssignmentsRepository.save(assignment);
  }

  /**
   * Belirli bir zaman diliminde kullanıcının çakışan vardiya atamalarını bulur
   * @param userId Kullanıcı ID
   * @param startTime Başlangıç zamanı
   * @param endTime Bitiş zamanı
   * @returns Çakışan atama listesi
   */
  async findConflictingAssignments(
    userId: number,
    startTime: Date,
    endTime: Date
  ): Promise<ShiftAssignment[]> {
    return this.shiftAssignmentsRepository.find({
      where: [
        {
          userId,
          status: AssignmentStatus.ASSIGNED,
          shift: {
            startTime: Between(startTime, endTime)
          }
        },
        {
          userId,
          status: AssignmentStatus.ASSIGNED,
          shift: {
            endTime: Between(startTime, endTime)
          }
        },
        {
          userId,
          status: AssignmentStatus.ASSIGNED,
          shift: {
            startTime: LessThanOrEqual(startTime),
            endTime: MoreThanOrEqual(endTime)
          }
        }
      ],
      relations: ['shift']
    });
  }

  /**
   * Belirli bir vardiyaya atanan çalışanları listeler
   * @param shiftId Vardiya ID
   * @returns Atama listesi
   */
  async findAssignmentsByShift(shiftId: number): Promise<ShiftAssignment[]> {
    return this.shiftAssignmentsRepository.find({
      where: { shiftId },
      relations: ['user'],
      order: { createdAt: 'ASC' }
    });
  }

  /**
   * Belirli bir kullanıcıya ait vardiya atamalarını listeler
   * @param userId Kullanıcı ID
   * @param startDate Başlangıç tarihi filtresi
   * @param endDate Bitiş tarihi filtresi
   * @returns Atama listesi
   */
  async findAssignmentsByUser(
    userId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<ShiftAssignment[]> {
    let queryBuilder = this.shiftAssignmentsRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.shift', 'shift')
      .where('assignment.userId = :userId', { userId });
    
    if (startDate) {
      queryBuilder = queryBuilder.andWhere('shift.startTime >= :startDate', { startDate });
    }
    
    if (endDate) {
      queryBuilder = queryBuilder.andWhere('shift.endTime <= :endDate', { endDate });
    }
    
    return queryBuilder
      .orderBy('shift.startTime', 'ASC')
      .getMany();
  }
}
