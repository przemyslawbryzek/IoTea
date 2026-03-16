import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);
  private keepAliveTimer?: NodeJS.Timeout;

  onModuleInit() {
    const mqttUrl = process.env.MQTT_URL ?? 'mqtt://emqx:1883';
    this.logger.log(`MQTT worker started. Broker URL: ${mqttUrl}`);

    // Keep the process alive until real MQTT consumers are attached.
    this.keepAliveTimer = setInterval(() => {
      // intentional no-op
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
    }
  }
}
