import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ApiModule } from './api.module';
import { Logger } from '@nestjs/common';

export async function bootstrapApi() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(ApiModule);

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('IoTea API')
    .setDescription('IoTea API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;

  await app.listen(port, '0.0.0.0');

  logger.log(`API is running on: http://localhost:${port}/api`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
