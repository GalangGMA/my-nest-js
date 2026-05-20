process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;
delete process.env.REDIS_HOST;

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';

interface HealthResponse {
  success: boolean;
  message: string;
  data: {
    status: string;
    service: string;
    timestamp: string;
    dependencies: {
      database: {
        status: string;
      };
      redis: {
        status: string;
      };
    };
  };
}

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        const responseBody = body as HealthResponse;

        expect(responseBody).toMatchObject({
          success: true,
          data: {
            status: 'ok',
            service: 'my-nest',
          },
        });
        expect(responseBody.message).toBe('Application is healthy');
        expect(['up', 'skipped']).toContain(
          responseBody.data.dependencies.database.status,
        );
        expect(['up', 'skipped']).toContain(
          responseBody.data.dependencies.redis.status,
        );
        expect(typeof responseBody.data.timestamp).toBe('string');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
