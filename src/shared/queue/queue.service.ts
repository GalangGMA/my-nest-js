import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.configService.get<string>('redis.host'));
  }

  getConnectionOptions() {
    if (!this.isEnabled()) {
      this.logger.warn(
        'Redis is not configured. Queue processing is disabled.',
      );
      return null;
    }

    return {
      host: this.configService.getOrThrow<string>('redis.host'),
      port: this.configService.getOrThrow<number>('redis.port'),
      password: this.configService.get<string>('redis.password') || undefined,
      db: this.configService.getOrThrow<number>('redis.db'),
    };
  }

  getPrefix(): string {
    return this.configService.getOrThrow<string>('redis.queuePrefix');
  }
}
