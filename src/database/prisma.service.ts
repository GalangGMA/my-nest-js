import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import databaseConfig from '../config/database.config';
import type { ConfigType } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    @Inject(databaseConfig.KEY)
    private readonly databaseConfiguration: ConfigType<typeof databaseConfig>,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    if (!this.databaseConfiguration.url) {
      this.logger.warn('DATABASE_URL is not set. Skipping Prisma connection.');
      return;
    }

    await this.$connect();
    this.logger.log('Prisma connection established');
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.databaseConfiguration.url) {
      return;
    }

    await this.$disconnect();
  }
}
