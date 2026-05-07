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

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit(): Promise<void> {
    const client = this.redisService.getClient();
    this.subscriber = client.duplicate();
    await this.subscriber.connect();

    await this.subscriber.subscribe(BREW_STATUS_CHANNEL, (message) => {
      try {
        const payload = JSON.parse(message) as {
          brew_id: number;
          device_id: string;
          status: string;
          timestamp: number;
          current_temp?: number | null;
          current_temp_updated_at?: string | null;
        };

        if (!payload?.brew_id) {
          return;
        }

        this.server.to(this._brewRoom(payload.brew_id)).emit('brew-status', payload);
      } catch (error) {
        this.logger.warn(`Failed to parse brew status message: ${String(error)}`);
      }
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

  private _brewRoom(brewId: number): string {
    return `brew:${brewId}`;
  }
}
