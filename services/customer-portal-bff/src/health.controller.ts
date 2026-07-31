import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', service: 'customer-portal-bff', timestamp: new Date().toISOString() };
  }
}
