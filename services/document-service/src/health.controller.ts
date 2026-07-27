import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import fs from 'fs';
import net from 'net';
import path from 'path';

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('/health')
  async health() {
    const components: Record<string, string> = {};

    try {
      await this.dataSource.query('SELECT 1');
      components.db = 'ok';
    } catch (err) {
      components.db = 'error';
      return this.buildResponse('degraded', components, err instanceof Error ? err.message : 'DB connection failed');
    }

    try {
      const uploadDir = process.env.DOCUMENT_UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.accessSync(uploadDir, fs.constants.R_OK | fs.constants.W_OK);
      components.storage = 'ok';
    } catch (err) {
      components.storage = 'error';
      return this.buildResponse('degraded', components, err instanceof Error ? err.message : 'Storage check failed');
    }

    try {
      const kafkaBrokers = process.env.KAFKA_BROKERS || '';
      if (kafkaBrokers) {
        const [firstBroker] = kafkaBrokers.split(',').map((x) => x.trim()).filter(Boolean);
        const [host, port] = firstBroker.split(':');
        const reachable = await this.isPortOpen(host, parseInt(port || '9092', 10));
        components.kafka = reachable ? 'ok' : 'unreachable';
      } else {
        components.kafka = 'not_configured';
      }
    } catch (err) {
      components.kafka = 'error';
    }

    const overall = Object.values(components).some((v) => v !== 'ok' && v !== 'not_configured') ? 'degraded' : 'ok';
    return this.buildResponse(overall, components);
  }

  private buildResponse(status: string, components: Record<string, string>, error?: string) {
    const response: any = {
      status,
      service: 'document-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components,
    };
    if (error) response.error = error;
    return response;
  }

  private isPortOpen(host: string, port: number, timeout = 3000): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, host);
    });
  }
}
