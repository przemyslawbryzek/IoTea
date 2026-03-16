import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'iotea-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  getLiveness() {
    return {
      status: 'ok',
      check: 'liveness',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  getReadiness() {
    return {
      status: 'ok',
      check: 'readiness',
      timestamp: new Date().toISOString(),
    };
  }
}
