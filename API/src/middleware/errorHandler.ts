import { Request, Response, NextFunction } from 'express';
import { logError } from '../utils/logger';

/**
 * Express error handling middleware
 * Logs all errors and sends appropriate response to client
 * Stack traces are only included in development mode
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Default to 500 server error
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  // Log the error with context
  logError('Express Error Handler', err, {
    method: req.method,
    url: req.url,
    statusCode,
    userId: req.userId, // Available if authenticate middleware was used
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress
  });

  // Prepare error response
  const errorResponse: any = {
    message: err.message || 'Internal Server Error',
    status: statusCode
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};