export interface LoggerConfig {
    serviceName: string;
    level?: string;
    prettyPrint?: boolean;
}
export declare class Logger {
    private logger;
    constructor(config: LoggerConfig);
    info(msg: string, context?: Record<string, unknown>): void;
    error(msg: string, error?: Error, context?: Record<string, unknown>): void;
    warn(msg: string, context?: Record<string, unknown>): void;
    debug(msg: string, context?: Record<string, unknown>): void;
    child(bindings: Record<string, unknown>): Logger;
}
export declare const createLogger: (config: LoggerConfig) => Logger;
