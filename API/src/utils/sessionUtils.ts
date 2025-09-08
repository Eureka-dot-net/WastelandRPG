import { ClientSession } from 'mongoose';
import mongoose from 'mongoose';
import { logError } from './logger';

/**
 * Type for functions that work with sessions
 */
export type SessionCallback<T> = (session: ClientSession) => Promise<T>;

/**
 * Check if the MongoDB deployment supports transactions
 */
export function supportsTransactions(): boolean {
  // Transactions require MongoDB 4.0+ and replica set or sharded cluster
  // Check if we're in production (definitely supports)
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  
  // Check if MONGO_URI indicates replica set
  if (process.env.MONGO_URI?.includes('replicaSet')) {
    return true;
  }
  
  // For test and development environments, be conservative and don't use transactions
  // unless explicitly configured as replica set
  return false;
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
export async function executeInParallel<T extends any[]>(
  operations: { [K in keyof T]: (session: ClientSession) => Promise<T[K]> },
  session: ClientSession
): Promise<T> {
  return await Promise.all(operations.map((op) => op(session))) as T;
}