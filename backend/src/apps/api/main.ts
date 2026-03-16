import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ApiModule } from './api.module';

export async function bootstrapApi() {
  const app = await NestFactory.create(ApiModule);
  app.setGlobalPrefix('api');
  const config = new DocumentBuilder()
    .setTitle('IoTea API')
    .setDescription('IoTea API description')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);
  await app.listen(process.env.PORT ?? 3000);
}

if (require.main === module) {
  void bootstrapApi();
}
