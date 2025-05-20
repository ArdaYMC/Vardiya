import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';

/**
 * ROLES_KEY kullanarak bir endpoint için gerekli rolleri tanımlarız
 */
export const ROLES_KEY = 'roles';

/**
 * Roles decorator - endpoint'lerin erişimi için gerekli rolleri belirtir
 */
export const Roles = (...roles: UserRole[]) => {
  return (target: any, key?: string, descriptor?: any) => {
    Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
    return descriptor;
  };
};

/**
 * Rol bazlı yetkilendirme guard'ı
 * JwtAuthGuard ile birlikte kullanılmalıdır
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Endpoint için gerekli rolleri al
    const requiredRoles = this.reflector.get<UserRole[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    // Rol kontrolü gerekli değilse erişime izin ver
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // JWT stratejisinden gelen user nesnesini al
    const { user } = context.switchToHttp().getRequest();
    
    // Kullanıcının rolü gerekli rollerden biriyle eşleşiyor mu kontrol et
    return requiredRoles.some((role) => user.role === role);
  }
}
