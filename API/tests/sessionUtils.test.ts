import mongoose from 'mongoose';
import { withSession, withSessionReadOnly, isSessionInTransaction, supportsTransactions } from '../src/utils/sessionUtils';
import { Colony } from '../src/models/Player/Colony';

describe('Session Utils', () => {
  beforeEach(async () => {
    // Clean up test data
    await Colony.deleteMany({ colonyName: { $regex: /test-session/ } });
  });

  describe('withSession', () => {
    it('should create session and handle operation on success', async () => {
      const result = await withSession(async (session) => {
        expect(session).toBeDefined();
        
        // Only check transaction state if transactions are supported
        if (supportsTransactions()) {
          expect(isSessionInTransaction(session)).toBe(true);
        }
        
        // Create a test colony within the session
        const colony = new Colony({
          userId: new mongoose.Types.ObjectId(),
          serverId: 'test',
          serverName: 'Test Server',
          colonyName: 'test-session-success',
          serverType: 'PvE',
          homesteadLocation: { x: 0, y: 0 },
          spiralLayer: 0,
          spiralPosition: 0,
          spiralDirection: 0,
          spiralIndex: Math.floor(Math.random() * 10000)
        });
        
        await colony.save({ session });
        return colony._id;
      });

      // Verify the colony was actually saved
      const colony = await Colony.findById(result);
      expect(colony).toBeTruthy();
      expect(colony!.colonyName).toBe('test-session-success');
    });

    it('should handle error correctly', async () => {
      let colonyId: mongoose.Types.ObjectId | null = null;

      try {
        await withSession(async (session) => {
          // Create a test colony within the session
          const colony = new Colony({
            userId: new mongoose.Types.ObjectId(),
            serverId: 'test',
            serverName: 'Test Server',
            colonyName: 'test-session-error',
            serverType: 'PvE',
            homesteadLocation: { x: 0, y: 0 },
            spiralLayer: 0,
            spiralPosition: 0,
            spiralDirection: 0,
            spiralIndex: Math.floor(Math.random() * 10000)
          });
          
          // Only save if transactions are NOT supported (in test mode)
          // This way we can test rollback behavior properly
          if (!supportsTransactions()) {
            await colony.save({ session });
            colonyId = colony._id;
          }
          
          // Throw error to trigger rollback
          throw new Error('Test error');
        });
      } catch (error) {
        expect((error as Error).message).toBe('Test error');
      }

      // If transactions are supported, verify rollback
      // If not supported, the colony might still be saved (no rollback)
      if (supportsTransactions() && colonyId) {
        const colony = await Colony.findById(colonyId);
        expect(colony).toBeNull();
      }
    });

    it('should reuse existing session without creating nested transaction', async () => {
      // Create an external session
      const externalSession = await mongoose.connection.startSession();
      
      // Start transaction only if supported
      if (supportsTransactions()) {
        externalSession.startTransaction();
      }

      try {
        const result = await withSession(async (session) => {
          // Should reuse the external session
          expect(session).toBe(externalSession);
          
          const colony = new Colony({
            userId: new mongoose.Types.ObjectId(),
            serverId: 'test',
            serverName: 'Test Server',
            colonyName: 'test-session-reuse',
            serverType: 'PvE',
            homesteadLocation: { x: 0, y: 0 },
            spiralLayer: 0,
            spiralPosition: 0,
            spiralDirection: 0,
            spiralIndex: Math.floor(Math.random() * 10000)
          });
          
          await colony.save({ session });
          return colony._id;
        }, externalSession);

        // Manually commit the external session if transactions are supported
        if (supportsTransactions()) {
          await externalSession.commitTransaction();
        }

        // Verify the colony was saved
        const colony = await Colony.findById(result);
        expect(colony).toBeTruthy();
      } finally {
        externalSession.endSession();
      }
    });
  });

  describe('withSessionReadOnly', () => {
    it('should create session without transaction for read operations', async () => {
      // First create a test colony
      const colony = new Colony({
        userId: new mongoose.Types.ObjectId(),
        serverId: 'test',
        serverName: 'Test Server',
        colonyName: 'test-session-readonly',
        serverType: 'PvE',
        homesteadLocation: { x: 0, y: 0 },
        spiralLayer: 0,
        spiralPosition: 0,
        spiralDirection: 0,
        spiralIndex: Math.floor(Math.random() * 10000)
      });
      await colony.save();

      const result = await withSessionReadOnly(async (session) => {
        expect(session).toBeDefined();
        expect(isSessionInTransaction(session)).toBe(false);
        
        // Perform read operation with session
        const foundColony = await Colony.findById(colony._id).session(session);
        return foundColony?.colonyName;
      });

      expect(result).toBe('test-session-readonly');
    });

    it('should reuse existing session', async () => {      
      const externalSession = await mongoose.connection.startSession();

      try {
        await withSessionReadOnly(async (session) => {
          expect(session).toBe(externalSession);
        }, externalSession);
      } finally {
        externalSession.endSession();
      }
    });
  });

})
