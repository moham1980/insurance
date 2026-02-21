import { AuthService } from './AuthService';

const service = new AuthService({
  name: 'auth-service',
  port: parseInt(process.env.PORT || '3007', 10),
  dbConfig: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
  },
});

async function main() {
  try {
    await service.initialize();
    await service.start();

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
