import { Controller, Get, Version } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Get application health status' })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  async getHealth() {
    const healthStatus = await this.healthService.getHealthStatus();

    return {
      message:
        healthStatus.status === 'ok'
          ? 'Application is healthy'
          : 'Application is degraded',
      data: healthStatus,
    };
  }
}
