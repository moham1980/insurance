import pino from 'pino';

export interface LoggerConfig {
  serviceName: string;
  level?: string;
  prettyPrint?: boolean;
}

export class Logger {
  private logger: pino.Logger;

  constructor(config: LoggerConfig) {
    this.logger = pino({
      level: config.level || 'info',
      transport: config.prettyPrint
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
      base: {
        service: config.serviceName,
      },
    });
  }

  info(msg: string, context?: Record<string, unknown>): void {
    this.logger.info(context || {}, msg);
  }

  error(msg: string, error?: Error, context?: Record<string, unknown>): void {
    this.logger.error(
      {
        ...(context || {}),
        error: error
          ? { message: error.message, stack: error.stack, name: error.name }
          : undefined,
      },
      msg
    );
  }

  warn(msg: string, context?: Record<string, unknown>): void {
    this.logger.warn(context || {}, msg);
  }

  debug(msg: string, context?: Record<string, unknown>): void {
    this.logger.debug(context || {}, msg);
  }

  child(bindings: Record<string, unknown>): Logger {
    const childLogger = new Logger({
      serviceName: this.logger.bindings().service as string,
      level: this.logger.level,
    });
    childLogger.logger = this.logger.child(bindings);
    return childLogger;
  }
}

export const createLogger = (config: LoggerConfig): Logger => new Logger(config);
