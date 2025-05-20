import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = this.jwtService.verify(token);
        
        if (decoded && decoded.organizationId) {
          // PostgreSQL'in RLS yapısı için gerekli ayarı yap
          await this.dataSource.query(`SET app.current_organization_id = '${decoded.organizationId}'`);
        }
      }
    } catch (error) {
      console.error('Tenant middleware error:', error);
    }
    
    next();
  }
}