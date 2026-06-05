import config from '../config/index';
import { Logger } from '../types/index';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogLevelMap = Record<LogLevel, number>;
const LOG_LEVELS: LogLevelMap = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class SimpleLogger implements Logger {
  private level: number;

  constructor() {
    this.level = LOG_LEVELS[config.LOG_LEVEL];
  }

  private format(logLevel: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
    return `[${timestamp}] [${logLevel.toUpperCase()}] ${message}${metaStr}`;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS.info >= this.level) {
      console.log(this.format('info', message, meta));
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS.error >= this.level) {
      console.error(this.format('error', message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS.warn >= this.level) {
      console.warn(this.format('warn', message, meta));
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS.debug >= this.level) {
      console.log(this.format('debug', message, meta));
    }
  }
}

export const logger = new SimpleLogger();
