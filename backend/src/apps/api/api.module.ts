import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { TeaModule } from './tea/tea.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { DeviceModule } from './device/device.module';
import { BrewModule } from './brew/brew.module';
import { MqttModule } from './mqtt/mqtt.module';
import { UserModule } from './user/user.module';
import { MyTeaModule } from './mytea/mytea.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    HealthModule,
    TeaModule,
    AuthModule,
    DeviceModule,
    BrewModule,
    MqttModule,
    UserModule,
    MyTeaModule,
    NotificationsModule,
  ],
})
export class ApiModule {}
