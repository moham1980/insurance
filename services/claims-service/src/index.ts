import { ClaimsService } from './ClaimsService';

const service = new ClaimsService({
  name: 'claims-service',
  port: parseInt(process.env.PORT || '3001', 10),
  dbConfig: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
  },
  kafkaConfig: process.env.KAFKA_BROKERS ? {
    brokers: process.env.KAFKA_BROKERS.split(','),
  } : undefined,
});

async function main() {
  try {
    await service.initialize();
    await service.start();
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      await service.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      await service.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
}

main();
