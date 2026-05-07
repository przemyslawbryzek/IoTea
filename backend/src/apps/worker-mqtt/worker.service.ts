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

    await this.prisma.device_status_event.create({
      data: {
        device_id: parseInt(device_id, 10),
        status,
        ts: new Date(timestamp * 1000),
      },
    });

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
    timestamp?: number;
  }): Promise<void> {
    const { device_id, brew_id, status, timestamp } = data;
    const normalizedStatus = status || 'brewing';
    const allowedStatuses = new Set(['starting', 'heating', 'pumping', 'brewing', 'completed', 'error']);

    if (!device_id || !brew_id) {
      this.logger.warn(`Invalid brew ack payload: ${JSON.stringify(data)}`);
      return;
    }

    if (!allowedStatuses.has(normalizedStatus)) {
      this.logger.warn(
        `Unknown brew ack status "${normalizedStatus}" for brew ${brew_id}`,
      );
      return;
    }

    this.logger.log(
      `Brew ACK received - Device: ${device_id}, Brew ID: ${brew_id}, Status: ${normalizedStatus}`,
    );

    try {
      const updateData: { status: string; start_time?: Date } = {
        status: normalizedStatus,
      };

      if (normalizedStatus === 'brewing') {
        const brewStartTs = timestamp ? timestamp * 1000 : Date.now();
        updateData.start_time = new Date(brewStartTs);
      }

      await this.prisma.brew.update({
        where: { id: brew_id },
        data: updateData,
      });

      this.logger.log(
        `Updated brew ${brew_id} status to "${normalizedStatus}"`,
      );
      const ackTimestamp = timestamp ? timestamp * 1000 : Date.now();
      const eventTemp = await this._getCurrentTemperature(device_id);
      await this.prisma.brew_status_event.create({
        data: {
          brew_id,
          device_id: parseInt(device_id, 10),
          status: normalizedStatus,
          ts: new Date(ackTimestamp),
          current_temp: eventTemp?.temperature ?? null,
        },
      });

      await this._publishBrewStatus({
        brew_id,
        device_id,
        status: normalizedStatus,
        timestamp: ackTimestamp,
      });
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
      const endTimestamp = timestamp ? timestamp * 1000 : Date.now();
      await this.prisma.brew.update({
        where: { id: brew_id },
        data: {
          status: status,
          end_time: new Date(endTimestamp),
        },
      });

      this.logger.log(
        `Updated brew ${brew_id} status to "${status}" with finish time`,
      );
      const eventTemp = await this._getCurrentTemperature(device_id);
      await this.prisma.brew_status_event.create({
        data: {
          brew_id,
          device_id: parseInt(device_id, 10),
          status,
          ts: new Date(endTimestamp),
          current_temp: eventTemp?.temperature ?? null,
        },
      });

      await this._publishBrewStatus({
        brew_id,
        device_id,
        status,
        timestamp: endTimestamp,
      });
    } catch (error) {
      this.logger.error(`Failed to update brew end ${brew_id}: ${error.message}`);
    }
  }

  private async _publishBrewStatus(payload: {
    brew_id: number;
    device_id: string;
    status: string;
    timestamp?: number;
  }): Promise<void> {
    try {
      const temperature = await this._getCurrentTemperature(payload.device_id);
      const message = {
        ...payload,
        timestamp: payload.timestamp ?? Date.now(),
        current_temp: temperature?.temperature ?? null,
        current_temp_updated_at: temperature
          ? new Date(temperature.timestamp * 1000).toISOString()
          : null,
      };
      await this.redis.publish('brew:status', JSON.stringify(message));
    } catch (error) {
      this.logger.warn(`Failed to publish brew status: ${error.message}`);
    }
  }

  private async _getCurrentTemperature(deviceId: string): Promise<
    | {
        temperature: number;
        timestamp: number;
      }
    | null
  > {
    try {
      const raw = await this.redis.get(`device:${deviceId}:temp`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        temperature?: number;
        timestamp?: number;
      };

      if (typeof parsed.temperature !== 'number' || typeof parsed.timestamp !== 'number') {
        return null;
      }

      return { temperature: parsed.temperature, timestamp: parsed.timestamp };
    } catch {
      return null;
    }
  }

  onModuleDestroy() {
    if (this.mqttClient) {
      this.mqttClient.end();
      this.logger.log('MQTT disconnected');
    }
  }
}
