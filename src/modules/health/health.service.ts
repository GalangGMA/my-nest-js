import { Inject, Injectable } from '@nestjs/common';
import { ConfigService, type ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import databaseConfig from '../../config/database.config';
import { PrismaService } from '../../database/prisma.service';

export type DependencyStatus = 'up' | 'down' | 'skipped';

export interface DependencyHealth {
  status: DependencyStatus;
  details?: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  dependencies: {
    database: DependencyHealth;
    redis: DependencyHealth;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(databaseConfig.KEY)
    private readonly databaseConfiguration: ConfigType<typeof databaseConfig>,
  ) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const [database, redis] = await Promise.all([
      this.getDatabaseHealth(),
      this.getRedisHealth(),
    ]);

    return {
      status:
        database.status === 'down' || redis.status === 'down'
          ? 'degraded'
          : 'ok',
      service: 'my-nest',
      timestamp: new Date().toISOString(),
      dependencies: {
        database,
        redis,
      },
    };
  }

  private async getDatabaseHealth(): Promise<DependencyHealth> {
    if (!this.databaseConfiguration.url) {
      return {
        status: 'skipped',
        details: 'DATABASE_URL is not configured',
      };
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up' };
    } catch (error) {
      return {
        status: 'down',
        details:
          error instanceof Error ? error.message : 'Database check failed',
      };
    }
  }

  private async getRedisHealth(): Promise<DependencyHealth> {
    const host = this.configService.get<string>('redis.host');

    if (!host) {
      return {
        status: 'skipped',
        details: 'REDIS_HOST is not configured',
      };
    }

    const redis = new Redis({
      host,
      port: this.configService.getOrThrow<number>('redis.port'),
      password: this.configService.get<string>('redis.password') || undefined,
      db: this.configService.getOrThrow<number>('redis.db'),
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      connectTimeout: 1_000,
    });

    try {
      await redis.connect();
      await redis.ping();
      return { status: 'up' };
    } catch (error) {
      return {
        status: 'down',
        details: error instanceof Error ? error.message : 'Redis check failed',
      };
    } finally {
      redis.disconnect();
    }
  }
}
