import { Injectable, BadRequestException, Logger } from '@nestjs/common';
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
    return this.prisma.brew.findMany({
      where: {
        device: {
          owner_id: userId,
        },
      },
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

  async startBrew(userId: number, brewStartDto: BrewStartDto) {
    const { deviceId, instructionId, volumeMl, brewNumber } = brewStartDto;
    const instruction = await this.prisma.brewing_instructions.findUnique({
      where: { id: instructionId },
    });

    if (!instruction) {
      throw new BadRequestException('Brewing instruction not found');
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
