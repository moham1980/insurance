import { DataSource } from 'typeorm';

export class DbHelper {
  private static connections: Map<string, DataSource> = new Map();

  static async getConnection(schema: string): Promise<DataSource> {
    console.log(`[DbHelper] getConnection start: ${schema}`);
    if (this.connections.has(schema)) {
      const existing = this.connections.get(schema)!;
      if (existing.isInitialized) {
        console.log(`[DbHelper] getConnection reuse: ${schema}`);
        return existing;
      }
      this.connections.delete(schema);
    }

    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5435', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'insurance',
      password: process.env.DB_PASSWORD || 'insurance123',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'insurance_platform',
      schema,
      synchronize: false,
      logging: false,
    });

    console.log(`[DbHelper] getConnection initializing: ${schema}`);
    await dataSource.initialize();
    console.log(`[DbHelper] getConnection initialized: ${schema}`);
    await dataSource.query(`SET search_path TO ${schema}, public;`);
    console.log(`[DbHelper] getConnection search_path set: ${schema}`);
    this.connections.set(schema, dataSource);
    return dataSource;
  }

  static async truncateTable(schema: string, tableName: string): Promise<void> {
    console.log(`[DbHelper] truncateTable start: ${schema}.${tableName}`);
    const connection = await this.getConnection(schema);
    try {
      console.log(`[DbHelper] truncateTable executing TRUNCATE: ${schema}.${tableName}`);
      await connection.query(`TRUNCATE TABLE ${schema}.${tableName} CASCADE`);
      console.log(`[DbHelper] truncateTable done: ${schema}.${tableName}`);
    } catch (err: any) {
      // If table doesn't exist, just ignore (idempotent cleanup)
      if (err.message && (err.message.includes('does not exist') || err.code === '42P01')) {
        console.log(`[DbHelper] truncateTable ignored missing table: ${schema}.${tableName}`);
        return;
      }
      console.error(`[DbHelper] truncateTable error: ${schema}.${tableName}`, err.message);
      throw err;
    }
  }

  static async truncateAllTables(schema: string, tables: string[]): Promise<void> {
    for (const table of tables) {
      try {
        await this.truncateTable(schema, table);
      } catch {
        // ignore individual table errors
      }
    }
  }

  static async cleanup(schema: string): Promise<void> {
    const connection = await this.getConnection(schema);
    await connection.destroy();
    this.connections.delete(schema);
  }

  static async cleanupAll(): Promise<void> {
    for (const [schema, connection] of this.connections) {
      await connection.destroy();
    }
    this.connections.clear();
  }

  static async seedTable(schema: string, tableName: string, data: any[]): Promise<void> {
    const connection = await this.getConnection(schema);
    const repository = connection.getRepository(tableName);
    await repository.save(data);
  }

  static async executeQuery(schema: string, query: string, params?: any[]): Promise<any> {
    const connection = await this.getConnection(schema);
    return connection.query(query, params);
  }
}
