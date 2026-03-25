import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisClientType, createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;
  private available = false;

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const timeoutMs = Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? 1500);

    this.client = createClient({ url });

    this.client.on('error', (error: unknown) => {
      this.logger.error(`Redis connection error: ${String(error)}`);
      this.available = false;
    });

    try {
      await Promise.race([
        this.client.connect(),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`Redis connect timeout after ${timeoutMs}ms`)),
            timeoutMs,
          );
        }),
      ]);
      this.available = true;
      this.logger.log(`Redis connected: ${url}`);
    } catch (error) {
      this.available = false;
      try {
        this.client.destroy();
      } catch {
        // No-op: client may already be closed.
      }
      this.client = null;
      this.logger.warn(
        `Redis unavailable at startup (${url}). Falling back to no-cache mode: ${String(error)}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) {
      return;
    }

    if (this.client.isOpen) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis client is not initialized');
    }

    return this.client;
  }
  async getOrSet<T>(
    key: string,
    ttl: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    if (!this.client || !this.available || !this.client.isOpen) {
      return loader();
    }

    const client = this.getClient();

    try {
      const cached = await client.get(key);
      if (cached) return JSON.parse(cached) as T;
    } catch {
      this.logger.warn(`Failed to get cache for key: ${key}`);
    }

    const fresh = await loader();

    try {
      const jitter = Math.floor(Math.random() * 30);
      await client.set(key, JSON.stringify(fresh), { EX: ttl + jitter });
    } catch {
      this.logger.warn(`Failed to set cache for key: ${key}`);
    }

    return fresh;
  }
}
