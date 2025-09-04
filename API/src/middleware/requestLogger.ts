import { Request, Response, NextFunction } from 'express';
import { logger, sanitizeData } from '../utils/logger';

/**
 * Middleware to log all incoming HTTP requests
 * Logs method, URL, status code, duration, and request body for POST/PUT
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;

  // Override res.send to capture response details
  res.send = function(body: any) {
    const duration = Date.now() - startTime;
    const logData: Record<string, any> = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    };

    // Include request body for POST/PUT requests (sanitized)
    if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
      logData.requestBody = sanitizeData(req.body);
    }

    // Include query parameters if present
    if (Object.keys(req.query).length > 0) {
      logData.queryParams = sanitizeData(req.query);
    }

    // Include route parameters if present
    if (Object.keys(req.params).length > 0) {
      logData.routeParams = sanitizeData(req.params);
    }

    // Log level based on status code
    if (res.statusCode >= 500) {
      logger.error('HTTP Request', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }

    // Call the original send method
    return originalSend.call(this, body);
  };

  next();
};