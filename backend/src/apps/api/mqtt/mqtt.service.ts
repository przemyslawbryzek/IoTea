import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as mqtt from 'mqtt';
import { TeaService } from '../tea/tea.service';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;

  constructor(private readonly teaService: TeaService) {}

  onModuleInit() {
    const mqttUrl = process.env.MQTT_URL ?? 'mqtt://emqx:1883';
    const username = process.env.MQTT_API_USERNAME || 'api-user';
    const password = process.env.MQTT_API_PASSWORD || 'api-password';

    this.logger.log(`Connecting to MQTT: ${mqttUrl}`);

    this.client = mqtt.connect(mqttUrl, {
      username,
      password,
      clientId: `api-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
    });

    this.client.on('connect', () => {
      this.logger.log('MQTT API connected');
    });

    this.client.on('error', (err) => {
      this.logger.error(`MQTT error: ${err.message}`);
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
    }
  }

  async publishBrewStart(
    deviceId: string,
    brewData: {
      brewId: number;
      brewNumber: number;
      instructionId: number;
      volumeMl: number;
    },
  ): Promise<void> {
    // Fetch instruction with tea temperature from cached tea service
    const instruction = await this.teaService.getInstructionById(
      brewData.instructionId,
    );

    if (!instruction) {
      throw new Error(`Instruction ${brewData.instructionId} not found`);
    }
    const totalBrewSeconds =
      instruction.first_infusion_seconds +
      instruction.increment_seconds * (instruction.max_infusions - 1);

    const topic = `cmd/${deviceId}/brew/start`;
    const payload = {
      type: 'brew_start',
      brewId: brewData.brewId,
      brewNumber: brewData.brewNumber,
      volumeMl: brewData.volumeMl,
      brewTemperatureCelsius: instruction.tea.brew_temp,
      totalBrewSeconds,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Failed to publish to ${topic}: ${err.message}`);
          reject(err);
        } else {
          this.logger.log(`Published brew start to ${topic}`);
          resolve();
        }
      });
    });
  }

  async publishCommand(
    deviceId: string,
    command: string,
    data?: any,
  ): Promise<void> {
    const topic = `cmd/${deviceId}/${command}`;
    const payload = {
      type: command,
      ...data,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Failed to publish to ${topic}: ${err.message}`);
          reject(err);
        } else {
          this.logger.log(`Published ${command} to ${topic}`);
          resolve();
        }
      });
    });
  }
}
