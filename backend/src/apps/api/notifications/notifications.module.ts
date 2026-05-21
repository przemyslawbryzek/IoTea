import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from '../../notifications/notifications.service';

const NotificationsProvider = {
  provide: NotificationsService,
  useFactory: (prisma: PrismaService) => new NotificationsService(prisma),
  inject: [PrismaService],
};

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsProvider],
  exports: [NotificationsProvider],
})
export class NotificationsModule {}
