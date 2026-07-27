import { DataSource } from 'typeorm';
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
export declare const createDataSource: (config: DatabaseConfig) => DataSource;
export { DataSource };
