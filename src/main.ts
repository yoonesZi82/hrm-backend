import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as useragent from 'express-useragent';
import * as cookieParser from 'cookie-parser';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.use(useragent.express());
  app.use(cookieParser());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // ? Swagger config
  const config = new DocumentBuilder()
    .setTitle('HRM API')
    .setDescription('Auth + HRM system')
    .setVersion('1.0')
    .addBearerAuth() // For JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // ? 👉 http://localhost:3000/api

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
