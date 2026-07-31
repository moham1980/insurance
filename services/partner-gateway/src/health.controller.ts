import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', service: 'partner-gateway', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  readiness() {
    return { status: 'ready', service: 'partner-gateway', timestamp: new Date().toISOString() };
  }
}
