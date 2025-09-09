import winston from 'winston';

// Sensitive data fields that should be filtered from logs
const SENSITIVE_FIELDS = ['password', 'token', 'jwt', 'authorization', 'cookie', 'secret'];

/**
 * Recursively sanitize objects to remove sensitive data
 */
function sanitizeData(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeData);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Create a Winston logger instance configured for the environment
 */
function createLogger() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  // Base configuration
  const loggerConfig: winston.LoggerOptions = {
    level: isDevelopment ? 'debug' : 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: {
      service: 'wasteland-api',
      environment: process.env.NODE_ENV || 'development'
    },
    transports: [] as winston.transport[]
  };

  // Console transport configuration
  if (isDevelopment) {
    loggerConfig.level = 'warning'; // Limit to warning+ in dev to reduce noise
    // Pretty formatting for development
    (loggerConfig.transports as winston.transport[]).push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
            const metaString = Object.keys(meta).length > 0 ? 
              `\n${JSON.stringify(sanitizeData(meta), null, 2)}` : '';
            return `${timestamp} [${service}] ${level}: ${message}${metaString}`;
          })
        )
      })
    );
  } else {
    // JSON formatting for production (easier for log aggregation)
    (loggerConfig.transports as winston.transport[]).push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format.printf((info) => {
            return JSON.stringify(sanitizeData(info));
          })
        )
      })
    );
  }

  // In test mode, minimize logging to avoid cluttering test output
  if (isTest) {
    loggerConfig.level = 'error';
    loggerConfig.silent = true;
  }

  return winston.createLogger(loggerConfig);
}

// Create the logger instance
const logger = createLogger();

/**
 * Log contextual errors with additional metadata
 */
function logError(message: string, error: Error | unknown, context?: Record<string, any>) {
  const errorInfo: Record<string, any> = {
    message,
    ...(context && sanitizeData(context))
  };

  if (error instanceof Error) {
    errorInfo.error = {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  } else {
    errorInfo.error = sanitizeData(error);
  }

  logger.error(errorInfo);
}

/**
 * Log contextual warnings with additional metadata
 */
function logWarn(message: string, context?: Record<string, any>) {
  logger.warn(message, context && sanitizeData(context));
}

/**
 * Log contextual info with additional metadata
 */
function logInfo(message: string, context?: Record<string, any>) {
  logger.info(message, context && sanitizeData(context));
}

/**
 * Log contextual debug info with additional metadata
 */
function logDebug(message: string, context?: Record<string, any>) {
  logger.debug(message, context && sanitizeData(context));
}

// Export the logger and helper functions
export {
  logger,
  logError,
  logWarn,
  logInfo,
  logDebug,
  sanitizeData
};

// Export as default for convenience
export default logger;