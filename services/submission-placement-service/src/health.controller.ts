import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/health')
  health() {
    return { status: 'ok', service: 'submission-placement-service', version: '1.0.0' };
  }

  @Get('/ready')
  ready() {
    return { status: 'ready' };
  }
}
