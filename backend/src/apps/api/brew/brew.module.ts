import { Module } from '@nestjs/common';
import { BrewController } from './brew.controller';
import { BrewService } from './brew.service';
import { BrewGateway } from './brew.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, RedisModule, MqttModule, AuthModule],
  controllers: [BrewController],
  providers: [BrewService, BrewGateway],
  exports: [BrewService],
})
export class BrewModule {}
