import { DataSource, DataSourceOptions } from 'typeorm';
import { OutboxEvent } from '../events/OutboxEvent';
import { ConsumedEvent } from '../events/ConsumedEvent';
import { DeadLetterEvent } from '../events/DeadLetterEvent';
import { ConsentRecordEntity } from '../entities/ConsentRecordEntity';
import { LineageEventEntity } from '../entities/LineageEventEntity';
import { AddSharedTables1720000000000 } from '../migrations/1720000000000-AddSharedTables';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  entities?: any[];
  synchronize?: boolean;
  logging?: boolean;
}

export const createDataSource = (config: DatabaseConfig): DataSource => {
  const options: DataSourceOptions = {
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    entities: [
      OutboxEvent,
      ConsumedEvent,
      DeadLetterEvent,
      ConsentRecordEntity,
      LineageEventEntity,
      ...(config.entities || []),
    ],
    migrations: [AddSharedTables1720000000000],
    synchronize: config.synchronize || false,
    logging: config.logging || false,
  };

  return new DataSource(options);
};

export { DataSource };
