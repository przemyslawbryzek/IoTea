import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EmqxService } from '../emqx/emqx.service';

@Injectable()
export class DeviceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly emqx: EmqxService,
  ) {}

  async getAllByUser(userId: number) {
    const devices = await this.prisma.device.findMany({
      where: { owner_id: userId },
      select: {
        id: true,
        name: true,
        model: true,
        firmware_version: true,
        last_seen: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const withStatus = await Promise.all(
      devices.map(async (device) => {
        const [status, temperature] = await Promise.all([
          this._getStatusFromRedis(device.id),
          this._getTemperatureFromRedis(device.id),
        ]);

        return {
          ...device,
          online: status !== null,
          currentTemp: temperature?.temperature ?? null,
          currentTempUpdatedAt: temperature
            ? new Date(temperature.timestamp * 1000).toISOString()
            : null,
        };
      }),
    );

    return withStatus;
  }

  async getOne(userId: number, deviceId: number) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: {
        id: true,
        name: true,
        model: true,
        firmware_version: true,
        last_seen: true,
        created_at: true,
      },
    });

    const [status, temperature] = await Promise.all([
      this._getStatusFromRedis(deviceId),
      this._getTemperatureFromRedis(deviceId),
    ]);

    return {
      ...device,
      online: status !== null,
      currentTemp: temperature?.temperature ?? null,
      currentTempUpdatedAt: temperature
        ? new Date(temperature.timestamp * 1000).toISOString()
        : null,
    };
  }

  async getStatus(userId: number, deviceId: number) {
    const [status, temperature] = await Promise.all([
      this._getStatusFromRedis(deviceId),
      this._getTemperatureFromRedis(deviceId),
    ]);

    if (!status) {
      return {
        device_id: deviceId,
        online: false,
        last_seen: null,
        currentTemp: temperature?.temperature ?? null,
        currentTempUpdatedAt: temperature
          ? new Date(temperature.timestamp * 1000).toISOString()
          : null,
      };
    }

    return {
      device_id: deviceId,
      online: true,
      ...status,
      currentTemp: temperature?.temperature ?? null,
      currentTempUpdatedAt: temperature
        ? new Date(temperature.timestamp * 1000).toISOString()
        : null,
    };
  }

  async remove(userId: number, deviceId: number) {
    const device = await this.prisma.device.findFirst({
      where: {
        id: deviceId,
        owner_id: userId,
      },
      select: {
        id: true,
        name: true,
        mqtt_username: true,
      },
    });

    if (!device) {
      return { message: `Device ${deviceId} not found` };
    }

    await this.prisma.$transaction([
      this.prisma.brew.deleteMany({ where: { device_id: deviceId } }),
      this.prisma.device.delete({ where: { id: deviceId } }),
    ]);

    await this.emqx.deleteUser(device.mqtt_username);

    return { message: `Device ${device.name} deleted` };
  }

  private async _getStatusFromRedis(deviceId: number) {
    try {
      const client = this.redis.getClient();
      const raw = await client.get(`device:${deviceId}:status`);
      if (!raw) return null;
      return JSON.parse(raw) as {
        status: string;
        timestamp: number;
        last_seen: string;
      };
    } catch {
      return null;
    }
  }

  private async _getTemperatureFromRedis(deviceId: number) {
    try {
      const client = this.redis.getClient();
      const raw = await client.get(`device:${deviceId}:temp`);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as {
        temperature: number;
        timestamp: number;
      };

      if (typeof parsed.temperature !== 'number') return null;

      return parsed;
    } catch {
      return null;
    }
  }
}
