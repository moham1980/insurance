import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createLogger, KafkaProducer } from '@insurance/shared';

@Controller()
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get('/health')
  async health() {
    const components: Record<string, string> = {};
    try {
      const schema = process.env.DB_SCHEMA || 'workflow';
      await this.dataSource.query(`SELECT 1 FROM "${schema}".process_definitions LIMIT 1`);
      components.db = 'ok';
    } catch (error) {
      components.db = 'error';
      return { status: 'error', service: 'workflow-engine-service', timestamp: new Date().toISOString(), components, message: error instanceof Error ? error.message : 'DB error' };
    }

    const kafkaBrokers = process.env.KAFKA_BROKERS;
    if (typeof kafkaBrokers === 'string' && kafkaBrokers.trim().length > 0) {
      try {
        const logger = createLogger({ serviceName: 'workflow-engine-service-health', level: 'error' });
        const producer = new KafkaProducer({ brokers: kafkaBrokers.split(',').map(x => x.trim()).filter(Boolean), clientId: 'workflow-engine-service-health' }, logger);
        await producer.connect();
        await producer.disconnect();
        components.kafka = 'ok';
      } catch (error) {
        components.kafka = 'error';
      }
    } else {
      components.kafka = 'not_configured';
    }

    return { status: 'ok', service: 'workflow-engine-service', timestamp: new Date().toISOString(), components };
  }
}
