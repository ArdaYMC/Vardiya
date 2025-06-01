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

// Bildirim tipleri için yardımcı değişkenler
const NOTIFICATION_TYPES = {
  SHIFT_COMPLETED: 'shift_completed',
  SHIFT_CANCELLED: 'shift_cancelled'
} as const;

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
    
    // Atanan çalışanı bulup shift nesnesine ekleyelim
    if (shift && shift.assignedTo) {
      const assignedUser = await this.usersRepository.findOne({
        where: { id: shift.assignedTo }
      });
      if (assignedUser) {
        // DTO'ya aktarılabilmesi için özellik olarak ekleyelim
        (shift as any).assignedUser = assignedUser;
      }
    }

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
    
    const shift = await this.shiftsRepository.findOne({ 
      where: whereClause,
      relations: ['organization', 'creator']
    });
    
    // Atanan çalışanı bulup shift nesnesine ekleyelim
    if (shift && shift.assignedTo) {
      const assignedUser = await this.usersRepository.findOne({
        where: { id: shift.assignedTo }
      });
      if (assignedUser) {
        // DTO'ya aktarılabilmesi için özellik olarak ekleyelim
        (shift as any).assignedUser = assignedUser;
      }
    }
    
    if (!shift) {
      throw new NotFoundException(`ID: ${id} olan vardiya bulunamadı`);
    }
    
    // Tarih güncellemesi varsa kontrol et
    let startTime = shift.startTime;
    let endTime = shift.endTime;
    
    if (updateShiftDto.startTime) {
      startTime = new Date(updateShiftDto.startTime);
    }
    
    if (updateShiftDto.endTime) {
      endTime = new Date(updateShiftDto.endTime);
    }
    
    if (startTime >= endTime) {
      throw new BadRequestException('Başlangıç zamanı bitiş zamanından önce olmalıdır');
    }
    
    // assignedTo alanı varsa çalışanın varlığını kontrol et
    if (updateShiftDto['assignedTo'] !== undefined) {
      const assignedToId = updateShiftDto['assignedTo'];
      
      // Eğer atama siliniyorsa (çalışan ataması kaldırılıyorsa)
      if (assignedToId === null) {
        shift.assignedTo = null;
      } else if (assignedToId) {
        // Çalışan var mı kontrol et
        const employee = await this.usersRepository.findOne({ 
          where: { 
            id: assignedToId,
            organizationId: shift.organizationId
          }
        });
        
        if (!employee) {
          throw new NotFoundException(`ID: ${assignedToId} olan çalışan bulunamadı veya bu organizasyona ait değil`);
        }
        
        // Çakışan vardiya var mı kontrol et
        const conflictingAssignments = await this.findConflictingAssignments(
          assignedToId,
          startTime,
          endTime
        );
        
        // Sadece başka vardiyalardaki çakışmaları kontrol et
        const otherConflictingAssignments = conflictingAssignments.filter(
          assignment => assignment.shiftId !== id
        );
        
        if (otherConflictingAssignments.length > 0) {
          throw new ConflictException(
            `Çalışanın bu zaman diliminde çakışan vardiya ataması bulunmaktadır`
          );
        }
        
        // Atama işlemi
        shift.assignedTo = assignedToId;
        
        // Vardiya atama tablosunu güncelle (varsa) veya yeni oluştur
        const existingAssignment = await this.shiftAssignmentsRepository.findOne({
          where: { shiftId: id }
        });
        
        if (existingAssignment) {
          // Var olan atamayı güncelle
          existingAssignment.userId = assignedToId;
          existingAssignment.status = AssignmentStatus.ASSIGNED;
          await this.shiftAssignmentsRepository.save(existingAssignment);
        } else {
          // Yeni atama oluştur
          const assignment = this.shiftAssignmentsRepository.create({
            shiftId: id,
            userId: assignedToId,
            status: AssignmentStatus.ASSIGNED,
            assignedBy: updateShiftDto['assignedBy'] || 0
          });
          
          await this.shiftAssignmentsRepository.save(assignment);
        }
      }
    }
    
    // Vardiya durumu değişimini işle
    if (updateShiftDto.status && updateShiftDto.status !== shift.status) {
      // Durum geçişi geçerli mi kontrol et
      if (!this.isValidStatusTransition(shift.status, updateShiftDto.status)) {
        throw new BadRequestException(`Geçersiz durum geçişi: ${shift.status} -> ${updateShiftDto.status}`);
      }
      
      // Tamamlanma veya iptal durumu için bildirimler
      if (updateShiftDto.status === ShiftStatus.COMPLETED) {
        // Tüm atanmış çalışanlara bildirim gönder
        const assignments = await this.shiftAssignmentsRepository.find({
          where: { shiftId: id }
        });
        
        for (const assignment of assignments) {
          // Assignment durumunu güncelle
          assignment.status = AssignmentStatus.COMPLETED;
          await this.shiftAssignmentsRepository.save(assignment);
          
          // Bildirim gönder
          await this.notificationsService.create({
            type: NotificationType.SHIFT_UPDATED,
            title: 'Vardiya Tamamlandı',
            content: `${shift.title} vardiyası tamamlandı.`,
            recipientId: assignment.userId,
            organizationId: shift.organizationId,
            metadata: { shiftId: shift.id }
          });
        }
      }
      
      if (updateShiftDto.status === ShiftStatus.CANCELLED) {
        // Tüm atanmış çalışanların assignment durumunu REJECTED yap
        const assignments = await this.shiftAssignmentsRepository.find({
          where: { shiftId: id }
        });
        
        for (const assignment of assignments) {
          assignment.status = AssignmentStatus.REJECTED;
          await this.shiftAssignmentsRepository.save(assignment);
          
          // Bildirim gönder
          await this.notificationsService.create({
            type: NotificationType.SHIFT_UPDATED,
            title: 'Vardiya İptal Edildi',
            content: `${shift.title} vardiyası iptal edildi.`,
            recipientId: assignment.userId,
            organizationId: shift.organizationId,
            metadata: { shiftId: shift.id }
          });
        }
      }
    }
    
    // Güncelleme için birleştir
    Object.assign(shift, {
      ...updateShiftDto,
      startTime: startTime,
      endTime: endTime
    });
    
    const updatedShift = await this.shiftsRepository.save(shift);
    
    // Bu vardiyaya atanmış tüm çalışanları bul
    const assignments = await this.shiftAssignmentsRepository.find({
      where: { shiftId: id, status: AssignmentStatus.ASSIGNED },
      select: ['userId']
    });
    
    // Değişikliklerin özetini oluştur
    const changesText = 'Vardiya bilgileri güncellendi';
    
    if (assignments.length > 0) {
      const userIds = assignments.map(a => a.userId);
      
      // Toplu bildirim gönder
      if (this.notificationsService.createShiftUpdateNotifications) {
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
   * Vardiya durumu geçişinin geçerli olup olmadığını kontrol eder
   * @param currentStatus Mevcut durum
   * @param newStatus Yeni durum
   * @returns Geçiş geçerli mi
   */
  private isValidStatusTransition(currentStatus: ShiftStatus, newStatus: ShiftStatus): boolean {
    // Aynı duruma geçiş her zaman geçerlidir
    if (currentStatus === newStatus) {
      return true;
    }
    
    // Durum geçiş kuralları
    switch (currentStatus) {
      case ShiftStatus.PLANNED:
        // Planlanmış durumdan her duruma geçilebilir
        return true;
      
      case ShiftStatus.CONFIRMED:
        // Onaylanmış durumdan yalnızca tamamlandı veya iptal edildi durumlarına geçilebilir
        return [
          ShiftStatus.COMPLETED,
          ShiftStatus.CANCELLED
        ].includes(newStatus);
      
      case ShiftStatus.COMPLETED:
      case ShiftStatus.CANCELLED:
        // Tamamlanmış veya iptal edilmiş durumlardan başka duruma geçilemez
        return false;
      
      default:
        return false;
    }
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
