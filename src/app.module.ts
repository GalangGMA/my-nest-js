import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { CacheModule } from './shared/cache/cache.module';
import { EventsModule } from './shared/events/events.module';
import { QueueModule } from './shared/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig],
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    CacheModule,
    EventsModule,
    QueueModule,
    HealthModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
