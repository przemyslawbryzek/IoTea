import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

const logger = new Logger('WorkerMQTT');

export async function bootstrapWorkerMqtt() {
  logger.log('Starting MQTT worker...');
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  logger.log('MQTT worker initialized');
}

if (require.main === module) {
  void bootstrapWorkerMqtt();
}
