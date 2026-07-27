"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("./data-source");
const pg_1 = require("pg");
async function main() {
    const schema = process.env.DB_SCHEMA || 'public';
    const client = new pg_1.Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
    });
    await client.connect();
    try {
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
        await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    }
    finally {
        await client.end();
    }
    await data_source_1.AppDataSource.initialize();
    try {
        await data_source_1.AppDataSource.runMigrations({ transaction: 'all' });
    }
    finally {
        await data_source_1.AppDataSource.destroy();
    }
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
