import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { NotificationLog } from './entities/NotificationLog';
import { EmailTemplate } from './entities/EmailTemplate';
import { SmsTemplate } from './entities/SmsTemplate';
import { OutboxEvent } from '@insurance/shared';
import { Init1700000000700 } from './migrations/1700000000700-init';
import { AddNotificationTemplates1760000000801 } from './migrations/1760000000801-add-notification-templates';
import { NotificationServiceFixes1760000000802 } from './migrations/1760000000802-notification-service-fixes';

async function migrate() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
    schema: process.env.DB_SCHEMA || 'notification',
    synchronize: false,
    logging: true,
    entities: [NotificationLog, EmailTemplate, SmsTemplate, OutboxEvent],
    migrations: [Init1700000000700, AddNotificationTemplates1760000000801, NotificationServiceFixes1760000000802],
    migrationsRun: false,
    migrationsTableName: 'migrations',
  });

  try {
    await dataSource.initialize();
    console.log('Running migrations...');
    const results = await dataSource.runMigrations({ transaction: 'all' });
    for (const migration of results) {
      console.log(`Executed migration: ${migration.name}`);
    }
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

migrate();
