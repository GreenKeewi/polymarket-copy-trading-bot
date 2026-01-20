import winston from 'winston';
import { config } from '../config/ConfigManager';

const logLevel = process.env.LOG_LEVEL || 'info';

// CRITICAL: Never log sensitive data
const sanitizeFormat = winston.format((info) => {
  // Remove any potential private keys or sensitive data
  const sensitive = ['privateKey', 'private_key', 'secret', 'password', 'apiKey', 'api_key'];
  
  const sanitize = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized: any = Array.isArray(obj) ? [] : {};
    
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      if (sensitive.some(s => lowerKey.includes(s))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitized[key] = sanitize(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    
    return sanitized;
  };

  if (info.meta) {
    info.meta = sanitize(info.meta);
  }
  
  return info;
});

const testModeFormat = winston.format((info) => {
  if (config.isTestMode()) {
    info.message = `[TEST MODE] ${info.message}`;
  }
  return info;
});

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    sanitizeFormat(),
    testModeFormat(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
      }
      return log;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let log = `${timestamp} [${level}]: ${message}`;
          const metaStr = JSON.stringify(meta);
          if (Object.keys(meta).length > 0 && !(typeof message === 'string' && message.includes(metaStr))) {
            log += ` ${JSON.stringify(meta, null, 2)}`;
          }
          return log;
        })
      ),
    }),
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
  }));
  
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
  }));
}

export { logger };
