import { app } from './app';
import { connectDB } from './config/db';
import { logInfo, logError } from './utils/logger';

const PORT = process.env.PORT || 3000;

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  logError('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
    promise: promise.toString()
  });
  // Don't exit the process in production, but log it
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logError('Uncaught Exception', error);
  // Exit the process for uncaught exceptions
  process.exit(1);
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
  logInfo('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

// Handle SIGINT gracefully
process.on('SIGINT', () => {
  logInfo('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Only connect to DB and start server when this file is run directly
connectDB()
    .then(() => {
        app.listen(PORT, () => {
            logInfo('Server started successfully', { 
              port: PORT, 
              environment: process.env.NODE_ENV || 'development' 
            });
        });
    })
    .catch((error) => {
        logError('Database connection failed', error);
        process.exit(1);
    });