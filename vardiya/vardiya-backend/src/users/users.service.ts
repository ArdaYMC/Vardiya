import { Injectable, NotFoundException, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Kullanıcı şifresi için hash oluşturur
   * @param password Şifre metni
   * @returns Hash edilmiş şifre
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  /**
   * Şifreleri karşılaştırır
   * @param plainPassword Düz metin şifre
   * @param hashedPassword Hash edilmiş şifre
   * @returns Eşleşme durumu (boolean)
   */
  async comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Yeni bir kullanıcı oluşturur
   * @param createUserDto Kullanıcı verileri
   * @returns Oluşturulan kullanıcı
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // E-posta adresiyle kayıtlı başka bir kullanıcı var mı kontrol et
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email }
    });

    if (existingUser) {
      throw new ConflictException('Bu e-posta adresi ile kayıtlı bir kullanıcı zaten var');
    }

    // Şifreyi hashle
    const hashedPassword = await this.hashPassword(createUserDto.password);

    // Yeni kullanıcı oluştur
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.usersRepository.save(user);
    return new UserResponseDto(savedUser);
  }

  /**
   * Tüm kullanıcıları listeler
   * @param organizationId Organizasyon filtresi (opsiyonel)
   * @returns Kullanıcı listesi
   */
  async findAll(organizationId?: number): Promise<UserResponseDto[]> {
    const whereClause = organizationId ? { organizationId } : {};
    const users = await this.usersRepository.find({ where: whereClause });
    return users.map(user => new UserResponseDto(user));
  }

  /**
   * ID'ye göre kullanıcı bulur
   * @param id Kullanıcı ID
   * @param organizationId Organizasyon filtresi (opsiyonel)
   * @returns Bulunan kullanıcı
   */
  async findOne(id: number, organizationId?: number): Promise<UserResponseDto> {
    const whereClause: any = { id };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const user = await this.usersRepository.findOne({
      where: whereClause,
      relations: ['organization'],
    });

    if (!user) {
      throw new NotFoundException(`ID: ${id} olan kullanıcı bulunamadı`);
    }

    return new UserResponseDto(user);
  }

  /**
   * E-posta'ya göre kullanıcı bulur (kimlik doğrulama için)
   * @param email E-posta adresi
   * @returns Bulunan kullanıcı veya null
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['organization'],
    });
  }

  /**
   * Kullanıcı bilgilerini günceller
   * @param id Kullanıcı ID
   * @param updateUserDto Güncellenecek veriler
   * @param organizationId Organizasyon filtresi (opsiyonel)
   * @returns Güncellenmiş kullanıcı
   */
  async update(id: number, updateUserDto: UpdateUserDto, organizationId?: number): Promise<UserResponseDto> {
    // Kullanıcının var olduğunu kontrol et
    const whereClause: any = { id };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }
    
    const user = await this.usersRepository.findOne({ where: whereClause });
    if (!user) {
      throw new NotFoundException(`ID: ${id} olan kullanıcı bulunamadı`);
    }

    // Şifre değişikliği varsa
    if (updateUserDto.password) {
      // Mevcut şifre doğrulaması
      if (updateUserDto.currentPassword) {
        const isPasswordValid = await this.comparePasswords(
          updateUserDto.currentPassword,
          user.password
        );

        if (!isPasswordValid) {
          throw new UnauthorizedException('Mevcut şifre yanlış');
        }
      } else {
        // Admin değilse ve mevcut şifre verilmediyse hata ver
        throw new BadRequestException('Şifre değişikliği için mevcut şifre gereklidir');
      }

      // Yeni şifre hash'lenir
      updateUserDto.password = await this.hashPassword(updateUserDto.password);
    }

    // Email değişiyorsa, yeni email'in başka bir kullanıcıda kullanılmadığını kontrol et
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email }
      });

      if (existingUser) {
        throw new ConflictException('Bu e-posta adresi ile kayıtlı başka bir kullanıcı zaten var');
      }
    }

    // Kullanıcıyı güncelle
    // currentPassword alanını kaldır, veritabanında yok
    const { currentPassword, ...updateData } = updateUserDto;
    await this.usersRepository.update(id, updateData);
    
    // Güncellenmiş veriyi getir
    const updatedUser = await this.usersRepository.findOne({ where: { id } });
    
    if (!updatedUser) {
      throw new NotFoundException(`Güncellenmiş kullanıcı bulunamadı`);
    }
    
    return new UserResponseDto(updatedUser);
  }

  /**
   * Kullanıcıyı siler
   * @param id Kullanıcı ID
   * @param organizationId Organizasyon filtresi (opsiyonel)
   * @returns Silme işleminin başarılı olduğunu belirten mesaj
   */
  async remove(id: number, organizationId?: number): Promise<{ message: string }> {
    const whereClause: any = { id };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }
    
    const user = await this.usersRepository.findOne({ where: whereClause });
    
    if (!user) {
      throw new NotFoundException(`ID: ${id} olan kullanıcı bulunamadı`);
    }

    // Organizasyondaki son admin kullanıcısı mı kontrol et
    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.usersRepository.count({
        where: {
          organizationId: user.organizationId,
          role: UserRole.ADMIN
        }
      });

      if (adminCount <= 1) {
        throw new ConflictException('Organizasyondaki son admin kullanıcısı silinemez');
      }
    }

    await this.usersRepository.remove(user);
    return { message: 'Kullanıcı başarıyla silindi' };
  }

  /**
   * Şifre sıfırlama token'ını kaydeder
   * @param userId Kullanıcı ID
   * @param resetToken Token
   * @param expiresAt Son geçerlilik tarihi
   */
  async savePasswordResetToken(userId: number, resetToken: string, expiresAt: Date): Promise<void> {
    await this.usersRepository.update(userId, {
      resetToken,
      resetTokenExpires: expiresAt
    });
  }

  /**
   * Token ile kullanıcı bulur
   * @param token Şifre sıfırlama token'ı
   * @returns Bulunan kullanıcı veya null
   */
  async findUserByResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { resetToken: token }
    });
  }

  /**
   * Kullanıcı şifresini günceller (şifre sıfırlama için)
   * @param userId Kullanıcı ID
   * @param newPassword Yeni şifre
   */
  async updatePassword(userId: number, newPassword: string): Promise<void> {
    const hashedPassword = await this.hashPassword(newPassword);
    await this.usersRepository.update(userId, {
      password: hashedPassword
    });
  }

  /**
   * Şifre sıfırlama token bilgilerini temizler
   * @param userId Kullanıcı ID
   */
  async clearPasswordResetToken(userId: number): Promise<void> {
    await this.usersRepository.update(userId, {
      resetToken: '',
      resetTokenExpires: undefined
    });
  }
}
