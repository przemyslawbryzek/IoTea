import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MqttService } from '../mqtt/mqtt.service';
import { BrewStartDto } from './dto/brew-start.dto';

@Injectable()
export class BrewService {
  private readonly logger = new Logger(BrewService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private mqttService: MqttService,
  ) {}
  async getAllByUser(userId: number) {
    const brews = await this.prisma.brew.findMany({
      where: {
        device: {
          owner_id: userId,
        },
      },
      include: {
        instruction: {
          select: {
            max_infusions: true,
            first_infusion_seconds: true,
            increment_seconds: true,
            teaId: true,
            userTeaId: true,
            tea: {
              select: {
                id: true,
                name: true,
                image_url: true,
                brew_temp: true,
              },
            },
            userTea: {
              select: {
                id: true,
                name: true,
                image_url: true,
                brew_temp: true,
              },
            },
          },
        },
        device: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

      return brews.map((brew) => {
        const infusionIndex = Math.max(1, Math.min(brew.brew_number, brew.instruction.max_infusions));
        const totalBrewSeconds =
          brew.instruction.first_infusion_seconds +
          brew.instruction.increment_seconds * (infusionIndex - 1);

        return {
          ...brew,
          max_brew: brew.instruction.max_infusions,
          total_brew_seconds: totalBrewSeconds,
          tea_id: brew.instruction.teaId ?? brew.instruction.userTeaId,
          tea_source: brew.instruction.userTeaId ? 'user' : 'base',
          tea_name: brew.instruction.userTea?.name ?? brew.instruction.tea?.name ?? null,
          tea_image_url: brew.instruction.userTea?.image_url ?? brew.instruction.tea?.image_url ?? null,
          tea_temp: brew.instruction.userTea?.brew_temp ?? brew.instruction.tea?.brew_temp ?? null,
          device_name: brew.device.name,
        };
      });
  }
  async getOne(userId: number, brewId: number) {
    return this.prisma.brew.findFirst({
      where: { id: brewId },
    });
  }
  async getStatus(userId: number, brewId: number) {
    const brew = await this.prisma.brew.findFirst({
      where: { id: brewId },
      select: { status: true },
    });
    if (!brew) {
      throw new Error('Brew not found');
    }
    return brew.status;
  }

  async getHistory(userId: number, brewId: number) {
    const brew = await this.prisma.brew.findFirst({
      where: {
        id: brewId,
        device: {
          owner_id: userId,
        },
      },
      select: { id: true },
    });

    if (!brew) {
      throw new NotFoundException('Brew not found');
    }

    return this.prisma.brew_status_event.findMany({
      where: { brew_id: brewId },
      orderBy: [{ ts: 'asc' }, { id: 'asc' }],
      select: {
        status: true,
        ts: true,
        current_temp: true,
      },
    });
  }

  async startBrew(userId: number, brewStartDto: BrewStartDto) {
    const { deviceId, instructionId, volumeMl, brewNumber } = brewStartDto;
    const instruction = await this.prisma.brewing_instructions.findUnique({
      where: { id: instructionId },
      include: {
        tea: {
          select: { id: true, brew_temp: true },
        },
        userTea: {
          select: { id: true, owner_id: true, brew_temp: true },
        },
        style: true,
      },
    });

    if (!instruction) {
      throw new BadRequestException('Brewing instruction not found');
    }

    if (instruction.userTeaId && instruction.userTea?.owner_id !== userId) {
      throw new ForbiddenException('You do not own this brewing instruction');
    }

    if (!instruction.teaId && !instruction.userTeaId) {
      throw new BadRequestException('Brewing instruction is not linked to a tea');
    }
    const brew = await this.prisma.brew.create({
      data: {
        device_id: deviceId,
        instruction_id: instructionId,
        volume_ml: volumeMl,
        brew_number: brewNumber,
        status: 'starting',
        start_time: new Date(),
      },
    });
    try {
      await this.mqttService.publishBrewStart(deviceId.toString(), {
        brewId: brew.id,
        brewNumber,
        instructionId,
        volumeMl,
      });
      this.logger.log(`Brew started: ${brew.id} on device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to send MQTT command: ${error.message}`);
      throw new BadRequestException('Failed to send start command to device');
    }

    return brew;
  }
}
