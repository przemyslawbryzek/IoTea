import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmqxService } from '../emqx/emqx.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emqxService: EmqxService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      expires_in: 900,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = { email: user.email, sub: user.id, role: user.role };
      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: '15m',
      });

      return {
        access_token: newAccessToken,
        expires_in: 900,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async register(email: string, password: string, name?: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword, name },
    });
    const { password: _, ...result } = user;
    return result;
  }
  async registerDevice(userId: number, name: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const existing = await this.prisma.device.findFirst({
      where: { name, owner_id: userId },
    });
    if (existing) {
      throw new ConflictException('Device with this name already exists');
    }

    const mqttUsername = `dev_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const mqttPassword = crypto.randomBytes(24).toString('hex');
    await this.emqxService.createUser(mqttUsername, mqttPassword);

    const device = await this.prisma.device.create({
      data: {
        name,
        owner: { connect: { id: userId } },
        mqtt_username: mqttUsername,
        mqtt_password: mqttPassword,
      },
    });
    return {
      ...device,
      mqtt_broker: 'mqtt://10.91.152.12:1883',
    };
  }
}
