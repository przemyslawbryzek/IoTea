import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeviceOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const deviceId =
      request.params.deviceId || request.params.id || request.body?.deviceId;

    if (!user) {
      throw new BadRequestException('User not found in request');
    }

    if (!deviceId) {
      throw new BadRequestException('Device ID is required');
    }

    const device = await this.prisma.device.findUnique({
      where: { id: parseInt(deviceId, 10) },
      select: { id: true, owner_id: true },
    });

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    if (device.owner_id !== user.id) {
      throw new ForbiddenException(
        `Access denied: you do not own device ${deviceId}`,
      );
    }

    return true;
  }
}
