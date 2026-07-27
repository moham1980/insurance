import pino from 'pino';
export class Logger {
    logger;
    constructor(config) {
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
    info(msg, context) {
        this.logger.info(context || {}, msg);
    }
    error(msg, error, context) {
        this.logger.error({
            ...(context || {}),
            error: error
                ? { message: error.message, stack: error.stack, name: error.name }
                : undefined,
        }, msg);
    }
    warn(msg, context) {
        this.logger.warn(context || {}, msg);
    }
    debug(msg, context) {
        this.logger.debug(context || {}, msg);
    }
    child(bindings) {
        const childLogger = new Logger({
            serviceName: this.logger.bindings().service,
            level: this.logger.level,
        });
        childLogger.logger = this.logger.child(bindings);
        return childLogger;
    }
}
export const createLogger = (config) => new Logger(config);
//# sourceMappingURL=logger.js.map