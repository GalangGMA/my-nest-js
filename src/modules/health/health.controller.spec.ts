import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let healthController: HealthController;

  const healthService = {
    getHealthStatus: jest.fn(),
  };

  beforeEach(async () => {
    healthService.getHealthStatus.mockResolvedValue({
      status: 'ok',
      service: 'my-nest',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: { status: 'skipped' },
        redis: { status: 'skipped' },
      },
    });

    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: healthService,
        },
      ],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  it('returns application health payload', async () => {
    const response = await healthController.getHealth();

    expect(response.message).toBe('Application is healthy');
    expect(response.data).toMatchObject({
      status: 'ok',
      service: 'my-nest',
      dependencies: {
        database: { status: 'skipped' },
        redis: { status: 'skipped' },
      },
    });
    expect(typeof response.data.timestamp).toBe('string');
  });
});
