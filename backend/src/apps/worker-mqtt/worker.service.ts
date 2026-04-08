import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import * as mqtt from 'mqtt';
import { PrismaClient } from '@prisma/client';
import type { RedisClientType } from 'redis';

const DEVICE_STATUS_TTL = 90;
const DEVICE_STATUS_KEY = (deviceId: string) => `device:${deviceId}:status`;

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);
  private mqttClient: mqtt.MqttClient;

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    @Inject('REDIS') private readonly redis: RedisClientType,
  ) {}

  onModuleInit() {
    const mqttUrl = process.env.MQTT_URL ?? 'mqtt://emqx:1883';
    const mqttUsername = process.env.MQTT_WORKER_USERNAME;
    const mqttPassword = process.env.MQTT_WORKER_PASSWORD;

    this.logger.log(`Connecting to MQTT broker: ${mqttUrl}`);

    this.mqttClient = mqtt.connect(mqttUrl, {
      username: mqttUsername,
      password: mqttPassword,
      clientId: `worker-mqtt-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
    });

    this.mqttClient.on('connect', () => {
      this.logger.log('MQTT connected');

      this.mqttClient.subscribe('device/+/status', { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Subscribe error: ${err.message}`);
        } else {
          this.logger.log('Subscribed to device/+/status');
        }
      });

      this.mqttClient.subscribe('telemetry/+/temp', { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Subscribe error: ${err.message}`);
        } else {
          this.logger.log('Subscribed to telemetry/+/temp');
        }
      });

      this.mqttClient.subscribe('device/+/brew/ack', { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Subscribe error: ${err.message}`);
        } else {
          this.logger.log('Subscribed to device/+/brew/ack');
        }
      });

      this.mqttClient.subscribe('device/+/brew/end', { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Subscribe error: ${err.message}`);
        } else {
          this.logger.log('Subscribed to device/+/brew/end');
        }
      });
    });

    this.mqttClient.on('message', (topic, payload) => {
      this._handleMessage(topic, payload).catch((err) => {
        const errorMsg = `Failed to process MQTT message on topic "${topic}": ${err.message}`;
        console.error(
          `\nMQTT ERROR\nTopic: ${topic}\nError: ${err.message}\nPayload: ${payload.toString()}\n`,
        );
        this.logger.error(errorMsg, {
          topic,
          payload: payload.toString(),
          stack: err.stack,
        });
      });
    });

    this.mqttClient.on('error', (err) => {
      this.logger.error(`MQTT error: ${err.message}`);
    });

    this.mqttClient.on('reconnect', () => {
      this.logger.warn('MQTT reconnecting...');
    });
  }

  private async _handleMessage(topic: string, payload: Buffer): Promise<void> {
    let data: any;
    try {
      data = JSON.parse(payload.toString());
    } catch {
      this.logger.warn(`Invalid JSON on topic ${topic}`);
      return;
    }

    if (topic.match(/^device\/(.+)\/status$/)) {
      await this._handleStatus(data);
      return;
    }

    if (topic.match(/^telemetry\/(.+)\/temp$/)) {
      await this._handleTelemetry(data);
      return;
    }

    if (topic.match(/^device\/(.+)\/brew\/ack$/)) {
      await this._handleBrewAck(data);
      return;
    }

    if (topic.match(/^device\/(.+)\/brew\/end$/)) {
      await this._handleBrewEnd(data);
      return;
    }
  }

  private async _handleStatus(data: {
    device_id: string;
    status: string;
    timestamp: number;
  }): Promise<void> {
    const { device_id, status, timestamp } = data;

    if (!device_id || !status) {
      this.logger.warn(`Invalid status payload: ${JSON.stringify(data)}`);
      return;
    }

    this.logger.log(`Device ${device_id} status: ${status}`);

    const redisKey = DEVICE_STATUS_KEY(device_id);
    const redisValue = JSON.stringify({
      status,
      timestamp,
      last_seen: new Date().toISOString(),
    });

    if (status === 'offline') {
      await this.redis.del(redisKey);
    } else {
      await this.redis.set(redisKey, redisValue, { EX: DEVICE_STATUS_TTL });
    }

    await this.prisma.device.updateMany({
      where: { mqtt_username: { contains: `dev_` }, id: parseInt(device_id) },
      data: {
        last_seen: new Date(timestamp * 1000),
      },
    });
  }

  private async _handleTelemetry(data: {
    device_id: string;
    temperature: number;
    timestamp: number;
  }): Promise<void> {
    const { device_id, temperature, timestamp } = data;

    if (!device_id || temperature === undefined) {
      this.logger.warn(`Invalid telemetry payload: ${JSON.stringify(data)}`);
      return;
    }

    this.logger.debug(`Device ${device_id} temp: ${temperature}°C`);

    await this.redis.set(
      `device:${device_id}:temp`,
      JSON.stringify({ temperature, timestamp }),
      { EX: 300 },
    );
  }

  private async _handleBrewAck(data: {
    device_id: string;
    brew_id?: number;
    status?: string;
  }): Promise<void> {
    const { device_id, brew_id, status } = data;

    if (!device_id || !brew_id) {
      this.logger.warn(`Invalid brew ack payload: ${JSON.stringify(data)}`);
      return;
    }

    this.logger.log(
      `Brew ACK received - Device: ${device_id}, Brew ID: ${brew_id}, Status: ${status || 'brewing'}`,
    );

    try {
      await this.prisma.brew.update({
        where: { id: brew_id },
        data: {
          status: status || 'brewing',
        },
      });

      this.logger.log(
        `Updated brew ${brew_id} status to "${status || 'brewing'}"`,
      );
    } catch (error) {
      this.logger.error(`Failed to update brew ${brew_id}: ${error.message}`);
    }
  }

  private async _handleBrewEnd(data: {
    device_id: string;
    brew_id: number;
    status?: string;
    timestamp?: number;
  }): Promise<void> {
    const { device_id, brew_id, status = 'completed', timestamp } = data;

    if (!device_id || !brew_id) {
      this.logger.warn(`Invalid brew end payload: ${JSON.stringify(data)}`);
      return;
    }

    this.logger.log(
      `Brew END received - Device: ${device_id}, Brew ID: ${brew_id}, Status: ${status}`,
    );

    try {
      await this.prisma.brew.update({
        where: { id: brew_id },
        data: {
          status: status,
          end_time: timestamp ? new Date(timestamp * 1000) : new Date(),
        },
      });

      this.logger.log(
        `Updated brew ${brew_id} status to "${status}" with finish time`,
      );
    } catch (error) {
      this.logger.error(`Failed to update brew end ${brew_id}: ${error.message}`);
    }
  }

  onModuleDestroy() {
    if (this.mqttClient) {
      this.mqttClient.end();
      this.logger.log('MQTT disconnected');
    }
  }
}
