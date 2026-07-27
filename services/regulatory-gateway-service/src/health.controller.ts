import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as net from 'net';
import { RegulatoryService } from './regulatory.service';

@Controller()
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly regulatoryService: RegulatoryService
  ) {}

  @Get('/health')
  async health() {
    const components: Record<string, string> = {};
    
    // Check DB connectivity
    try {
      await this.dataSource.query('SELECT 1');
      components.db = 'ok';
    } catch (err) {
      components.db = 'error';
      return { 
        status: 'degraded', 
        service: 'regulatory-gateway-service', 
        timestamp: new Date().toISOString(),
        components,
        error: err instanceof Error ? err.message : 'DB connection failed'
      };
    }

    // Check Sanhab connectivity
    try {
      const sanhabHealth = await this.regulatoryService.sanhabHealthCheck();
      components.sanhab = sanhabHealth.healthy ? 'ok' : 'degraded';
    } catch (err) {
      components.sanhab = 'error';
    }

    // Check Kafka broker reachability
    components.kafka = await this.checkKafkaHealth();

    const degraded = Object.values(components).some((v) => v === 'error' || v === 'degraded');

    return { 
      status: degraded ? 'degraded' : 'ok', 
      service: 'regulatory-gateway-service', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components
    };
  }

  private checkKafkaHealth(): Promise<string> {
    const brokers = process.env.KAFKA_BROKERS || process.env.KAFKA_BOOTSTRAP_SERVERS || '';
    if (!brokers) {
      return Promise.resolve('not_configured');
    }

    const firstBroker = brokers.split(',')[0].trim();
    const [host, port] = firstBroker.split(':');
    if (!host || !port) {
      return Promise.resolve('invalid_config');
    }

    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timer = setTimeout(() => {
        socket.destroy();
        resolve('timeout');
      }, 2000);

      socket.connect(parseInt(port, 10), host, () => {
        clearTimeout(timer);
        socket.destroy();
        resolve('ok');
      });

      socket.on('error', () => {
        clearTimeout(timer);
        resolve('error');
      });
    });
  }
}
