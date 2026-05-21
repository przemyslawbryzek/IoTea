import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import type { RedisClientType } from 'redis';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

const BREW_STATUS_CHANNEL = 'brew:status';

@WebSocketGateway({
  namespace: '/brews',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class BrewGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(BrewGateway.name);
  private subscriber: RedisClientType | null = null;

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    const client = this.redisService.getClient();
    this.subscriber = client.duplicate();
    await this.subscriber.connect();

    await this.subscriber.subscribe(BREW_STATUS_CHANNEL, (message) => {
      void this._handleBrewStatus(message);
    });

    this.logger.log('Brew websocket gateway subscribed to Redis channel');
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    try {
      await this.subscriber.unsubscribe(BREW_STATUS_CHANNEL);
    } catch {
      // Ignore unsubscribe errors during shutdown.
    }

    await this.subscriber.quit();
    this.subscriber = null;
  }

  handleConnection(client: Socket): void {
    const userId = this._parseUserId(client);
    if (userId) {
      client.join(this._userRoom(userId));
      this.logger.debug(`Client ${client.id} joined user ${userId}`);
    }

    const brewId = this._parseBrewId(client.handshake.query.brewId);
    if (brewId) {
      client.join(this._brewRoom(brewId));
      this.logger.debug(`Client ${client.id} joined brew ${brewId}`);
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { brewId?: number },
  ): void {
    const brewId = this._parseBrewId(body?.brewId);
    if (!brewId) {
      return;
    }

    client.join(this._brewRoom(brewId));
    this.logger.debug(`Client ${client.id} subscribed to brew ${brewId}`);
  }

  private _parseBrewId(value: unknown): number | null {
    if (Array.isArray(value)) {
      return this._parseBrewId(value[0]);
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private _parseUserId(client: Socket): number | null {
    const token = this._extractToken(client);
    if (!token) return null;

    try {
      const payload = this.jwtService.verify(token) as { sub?: number };
      return typeof payload.sub === 'number' ? payload.sub : null;
    } catch {
      return null;
    }
  }

  private _extractToken(client: Socket): string | null {
    const raw = client.handshake.auth?.token ?? client.handshake.query?.token;
    if (!raw) return null;

    const token = Array.isArray(raw) ? raw[0] : String(raw);
    return token.startsWith('Bearer ') ? token.slice(7) : token;
  }

  private _brewRoom(brewId: number): string {
    return `brew:${brewId}`;
  }

  private _userRoom(userId: number): string {
    return `user:${userId}`;
  }

  private async _handleBrewStatus(message: string): Promise<void> {
    try {
      const payload = JSON.parse(message) as {
        brew_id: number;
        device_id: string;
        status: string;
        timestamp: number;
        current_temp?: number | null;
        current_temp_updated_at?: string | null;
        owner_id?: number | null;
        tea_name?: string | null;
      };

      if (!payload?.brew_id) {
        return;
      }

      this.server.to(this._brewRoom(payload.brew_id)).emit('brew-status', payload);

      if (payload.status !== 'completed') {
        return;
      }

      const ownerId = payload.owner_id ?? (await this._lookupOwnerId(payload.brew_id));
      if (!ownerId) {
        this.logger.warn(`Missing owner_id for brew ${payload.brew_id} completion`);
        return;
      }

      this.server
        .to(this._userRoom(ownerId))
        .emit('brew-complete', { ...payload, owner_id: ownerId });
    } catch (error) {
      this.logger.warn(`Failed to parse brew status message: ${String(error)}`);
    }
  }

  private async _lookupOwnerId(brewId: number): Promise<number | null> {
    try {
      const brew = await this.prisma.brew.findUnique({
        where: { id: brewId },
        select: { device: { select: { owner_id: true } } },
      });

      return brew?.device?.owner_id ?? null;
    } catch (error) {
      this.logger.warn(`Failed to lookup owner_id for brew ${brewId}: ${String(error)}`);
      return null;
    }
  }
}
