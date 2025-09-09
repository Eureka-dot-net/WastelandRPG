import mongoose from 'mongoose';
import { withSession, supportsTransactions } from '../src/utils/sessionUtils';
import { Colony } from '../src/models/Player/Colony';
import { Settler } from '../src/models/Player/Settler';
import { Assignment } from '../src/models/Player/Assignment';

describe('Session Integration Tests', () => {
  let testColony: any;

  beforeEach(async () => {
    // Create a test colony for each test
    testColony = new Colony({
      userId: new mongoose.Types.ObjectId(),
      serverId: 'test-integration',
      serverName: 'Test Integration Server',
      colonyName: 'Integration Test Colony',
      serverType: 'PvE',
      homesteadLocation: { x: 0, y: 0 },
      spiralLayer: 0,
      spiralPosition: 0,
      spiralDirection: 0,
      spiralIndex: Math.floor(Math.random() * 10000)
    });
    await testColony.save();
  });

  afterEach(async () => {
    // Clean up test data
    await Colony.deleteMany({ colonyName: { $regex: /Integration Test/ } });
    if (testColony?._id) {
      await Settler.deleteMany({ colonyId: testColony._id });
      await Assignment.deleteMany({ colonyId: testColony._id });
    }
  });

  describe('Multi-collection operations', () => {
    it('should handle complex multi-collection writes in a single transaction', async () => {
      await withSession(async (session) => {
        // Create a settler
        const settler = new Settler({
          colonyId: testColony._id,
          nameId: 'test-name-1',
          name: 'Test Settler',
          backstory: 'A test settler for integration testing',
          theme: 'wasteland',
          isFemale: false,
          stats: { strength: 10, speed: 10, intelligence: 10, resilience: 10 },
          skills: { combat: 5, scavenging: 5, farming: 5, crafting: 5, medical: 5, engineering: 5 },
          interests: [],
          traits: [],
          status: 'idle',
          health: 100,
          morale: 90,
          carry: [],
          equipment: {},
          maxCarrySlots: 8,
          isActive: true,
          createdAt: new Date(),
          spiralLayer: 0,
          spiralPosition: 0,
          spiralDirection: 0,
          spiralIndex: 1
        });
        
        await settler.save({ session });
        
        // Add settler to colony
        testColony.settlers.push(settler._id);
        await testColony.save({ session });
        
        // Create an assignment for the settler
        const assignment = new Assignment({
          colonyId: testColony._id,
          settlerId: settler._id,
          type: 'quest',
          taskId: 'clean-debris',
          name: 'Clean Debris',
          description: 'Clean up debris around the colony',
          duration: 600, // 10 minutes in seconds
          state: 'in-progress',
          startedAt: new Date(),
          completedAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          plannedRewards: { scrap: 5 }
        });
        
        await assignment.save({ session });
        
        // All operations should be part of the same transaction
        return { settler, assignment };
      });

      // Verify all changes were committed
      const savedColony = await Colony.findById(testColony._id).populate('settlers');
      expect(savedColony).toBeTruthy();
      expect(savedColony!.settlers).toHaveLength(1);
      
      const savedSettler = await Settler.findOne({ colonyId: testColony._id });
      expect(savedSettler).toBeTruthy();
      expect(savedSettler!.name).toBe('Test Settler');
      
      const savedAssignment = await Assignment.findOne({ colonyId: testColony._id });
      expect(savedAssignment).toBeTruthy();
      expect(savedAssignment!.name).toBe('Clean Debris');
    });

    it('should rollback all changes when an error occurs', async () => {
      let settlerId: mongoose.Types.ObjectId | null = null;
      
      try {
        await withSession(async (session) => {
          // Create a settler first
          const settler = new Settler({
            colonyId: testColony._id,
            nameId: 'test-name-2',
            name: 'Test Settler 2',
            backstory: 'Another test settler',
            theme: 'wasteland',
            isFemale: true,
            stats: { strength: 10, speed: 10, intelligence: 10, resilience: 10 },
            skills: { combat: 5, scavenging: 5, farming: 5, crafting: 5, medical: 5, engineering: 5 },
            interests: [],
            traits: [],
            status: 'idle',
            health: 100,
            morale: 90,
            carry: [],
            equipment: {},
            maxCarrySlots: 8,
            isActive: true,
            createdAt: new Date(),
            spiralLayer: 0,
            spiralPosition: 0,
            spiralDirection: 0,
            spiralIndex: 2
          });
          
          await settler.save({ session });
          settlerId = settler._id;
          
          // Add settler to colony
          testColony.settlers.push(settler._id);
          await testColony.save({ session });
          
          // Create assignment with missing required 'duration' field to trigger validation error
          const assignment = new Assignment({
            colonyId: testColony._id,
            settlerId: settler._id,
            type: 'quest',
            name: 'Test Assignment'
            // Missing required 'duration' field - this should cause a validation error
          } as any);
          
          // This should throw a validation error before save completes
          await assignment.save({ session });
          
          // This should not be reached due to validation error above
          throw new Error('Validation error should have been thrown');
        });
        
        // If we get here, the test failed because no error was thrown
        fail('Expected validation error was not thrown');
      } catch (error: any) {
        // Validation error is expected - check for duration field requirement
        const errorMessage = error?.message || error?.toString() || '';
        expect(errorMessage).toMatch(/duration.*required|Path.*duration.*required|ValidationError/i);
      }

      // Verify rollback behavior based on transaction support
      if (supportsTransactions()) {
        // With transactions, all changes should be rolled back
        const foundColony = await Colony.findById(testColony._id);
        expect(foundColony!.settlers).toHaveLength(0);
        
        const foundSettler = settlerId ? await Settler.findById(settlerId) : null;
        expect(foundSettler).toBeNull();
      } else {
        // Without transactions (mock environment), some changes might persist
        // This is expected behavior - we just verify the validation error was caught
        console.log('ℹ️ Transaction rollback not supported - validation error properly caught in mock environment');
      }
    });
  });

  describe('Session reuse', () => {
    it('should reuse existing sessions in nested operations', async () => {
      const result = await withSession(async (outerSession) => {
        expect(outerSession).toBeDefined();
        
        // This inner withSession call should reuse the outer session
        const innerResult = await withSession(async (innerSession) => {
          expect(innerSession).toBe(outerSession);
          
          const settler = new Settler({
            colonyId: testColony._id,
            nameId: 'test-name-3',
            name: 'Test Nested Settler',
            backstory: 'A nested test settler',
            theme: 'wasteland',
            isFemale: false,
            stats: { strength: 10, speed: 10, intelligence: 10, resilience: 10 },
            skills: { combat: 5, scavenging: 5, farming: 5, crafting: 5, medical: 5, engineering: 5 },
            interests: [],
            traits: [],
            status: 'idle',
            health: 100,
            morale: 90,
            carry: [],
            equipment: {},
            maxCarrySlots: 8,
            isActive: true,
            createdAt: new Date(),
            spiralLayer: 0,
            spiralPosition: 0,
            spiralDirection: 0,
            spiralIndex: 3
          });
          
          await settler.save({ session: innerSession });
          return settler._id;
        }, outerSession);
        
        return innerResult;
      });
      
      // Verify the settler was created successfully
      const foundSettler = await Settler.findById(result);
      expect(foundSettler).toBeTruthy();
      expect(foundSettler!.name).toBe('Test Nested Settler');
    });
  });
});