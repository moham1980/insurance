import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', service: 'insurer-operations-bff', timestamp: new Date().toISOString() };
  }
}
