import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * İstek için yetkilendirme kontrolü
   * @param context Execution context
   * @returns İzin durumu
   */
  canActivate(context: ExecutionContext) {
    // İşlemi JWT authentication mekanizmasına ilet
    return super.canActivate(context);
  }
}
