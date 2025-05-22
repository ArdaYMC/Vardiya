import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global ValidationPipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  // CORS ayarları
  app.enableCors();
  
  // Global API prefix
  app.setGlobalPrefix('api');
  
  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Vardiya Yönetim API')
    .setDescription('Vardiya Yönetim Platformu API dokümantasyonu - Çoklu organizasyonlar için vardiya planlama ve yönetim sistemi')
    .setVersion('1.0')
    .addTag('Auth', 'Kimlik doğrulama ve yetkilendirme işlemleri')
    .addTag('Organizations', 'Organizasyon yönetim işlemleri')
    .addTag('Users', 'Kullanıcı yönetim işlemleri')
    .addTag('Shifts', 'Vardiya yönetim işlemleri')
    .addTag('Notifications', 'Bildirim yönetim işlemleri')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'JWT token bilgisini giriniz',
        in: 'header',
      },
      'access-token',
    )
    .build();
  
  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (
      controllerKey: string,
      methodKey: string
    ) => methodKey,
  });
  
  SwaggerModule.setup('api', app, document, {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
    },
  });
  
  // Config servisi
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  
  await app.listen(port);
  console.log(`Uygulama http://localhost:${port} adresinde çalışıyor`);
  console.log(`Swagger dokümantasyonu için: http://localhost:${port}/api`);
}
bootstrap();