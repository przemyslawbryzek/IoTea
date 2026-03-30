import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DeviceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
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
        const status = await this._getStatusFromRedis(device.id);
        return { ...device, online: status !== null };
      }),
    );

    return withStatus;
  }

  async getOne(userId: number, deviceId: number) {
    const device = await this._findAndVerify(userId, deviceId);

    const status = await this._getStatusFromRedis(deviceId);

    return {
      ...device,
      online: status !== null,
    };
  }

  async getStatus(userId: number, deviceId: number) {
    await this._findAndVerify(userId, deviceId);

    const status = await this._getStatusFromRedis(deviceId);

    if (!status) {
      return {
        device_id: deviceId,
        online: false,
        last_seen: null,
      };
    }

    return {
      device_id: deviceId,
      online: true,
      ...status,
    };
  }

  private async _findAndVerify(userId: number, deviceId: number) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: {
        id: true,
        name: true,
        model: true,
        firmware_version: true,
        last_seen: true,
        created_at: true,
        owner_id: true,
      },
    });

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    if (device.owner_id !== userId) {
      throw new ForbiddenException(`Access denied to device ${deviceId}`);
    }

    const { owner_id, ...rest } = device;
    return rest;
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
}
