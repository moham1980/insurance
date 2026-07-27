import { DataSource } from 'typeorm';
import { OutboxEvent } from '../events/OutboxEvent';
import { ConsumedEvent } from '../events/ConsumedEvent';
export const createDataSource = (config) => {
    const options = {
        type: 'postgres',
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        entities: [
            OutboxEvent,
            ConsumedEvent,
            ...(config.entities || []),
        ],
        synchronize: config.synchronize || false,
        logging: config.logging || false,
    };
    return new DataSource(options);
};
export { DataSource };
//# sourceMappingURL=index.js.map