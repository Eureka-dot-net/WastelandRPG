import { ClientSession } from 'mongoose';
import mongoose from 'mongoose';
import { logError } from './logger';

/**
 * Interface for session-aware operations
 */
export interface SessionOptions {
  session?: ClientSession;
}

/**
 * Type for functions that work with sessions
 */
export type SessionCallback<T> = (session: ClientSession) => Promise<T>;

/**
 * Check if the MongoDB deployment supports transactions
 */
export function supportsTransactions(): boolean {
  // Transactions require MongoDB 4.0+ and replica set or sharded cluster
  // For simplicity, we'll try to detect if we're in a replica set environment
  // In tests or single instance MongoDB, transactions are not supported
  return process.env.NODE_ENV !== 'test' && 
         process.env.MONGO_URI?.includes('replicaSet') || 
         process.env.NODE_ENV === 'production';
}

/**
 * Helper utility to execute operations within a MongoDB session/transaction.
 * If a session is provided, reuses it (no nested transaction).
 * If no session is provided, creates a new session and transaction (if supported).
 * 
 * @param operation - Function to execute with the session
 * @param existingSession - Optional existing session to reuse
 * @returns Promise resolving to the operation result
 */
export async function withSession<T>(
  operation: SessionCallback<T>,
  existingSession?: ClientSession
): Promise<T> {
  // If session is provided, reuse it (don't create nested transaction)
  if (existingSession) {
    return await operation(existingSession);
  }

  // Create new session
  const session = await mongoose.connection.startSession();
  
  // Start transaction only if supported
  const useTransaction = supportsTransactions();
  
  if (useTransaction) {
    session.startTransaction();
  }

  try {
    const result = await operation(session);
    
    if (useTransaction) {
      await session.commitTransaction();
    }
    
    return result;
  } catch (error) {
    if (useTransaction) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        logError('Failed to abort transaction', abortError);
      }
    }
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Helper to ensure a session is available for an operation.
 * If no session is provided, creates a temporary session without transaction.
 * Useful for read operations that need session consistency.
 * 
 * @param operation - Function to execute with the session
 * @param existingSession - Optional existing session to reuse
 * @returns Promise resolving to the operation result
 */
export async function withSessionReadOnly<T>(
  operation: SessionCallback<T>,
  existingSession?: ClientSession
): Promise<T> {
  // If session is provided, reuse it
  if (existingSession) {
    return await operation(existingSession);
  }

  // Create new session without transaction for read operations
  const session = await mongoose.connection.startSession();
  
  try {
    return await operation(session);
  } finally {
    session.endSession();
  }
}

/**
 * Wrapper for operations that need to support both session and non-session usage.
 * Maintains backward compatibility while providing session support.
 * 
 * @param operation - Function to execute
 * @param options - Optional session options
 * @returns Promise resolving to the operation result
 */
export async function withOptionalSession<T>(
  operation: SessionCallback<T>,
  options?: SessionOptions
): Promise<T> {
  if (options?.session) {
    return await operation(options.session);
  }
  
  return await withSession(operation);
}

/**
 * Check if a session is currently in a transaction
 * @param session - Session to check
 * @returns boolean indicating if session is in transaction
 */
export function isSessionInTransaction(session: ClientSession): boolean {
  return session.inTransaction();
}

/**
 * Safely execute multiple operations in parallel within a session
 * @param operations - Array of operations to execute
 * @param session - Session to use
 * @returns Promise resolving to array of results
 */
export async function executeInParallel<T>(
  operations: SessionCallback<T>[],
  session: ClientSession
): Promise<T[]> {
  return await Promise.all(operations.map(op => op(session)));
}