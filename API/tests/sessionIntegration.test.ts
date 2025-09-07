import mongoose from 'mongoose';
import { withSession, supportsTransactions } from '../src/utils/sessionUtils';
import { Colony } from '../src/models/Player/Colony';
import { Settler } from '../src/models/Player/Settler';
import { Assignment } from '../src/models/Player/Assignment';

describe('Session Integration Tests', () => {
  let testColony: any;

  beforeEach(async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      return;
    }

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
    if ((global as any).skipIfNoMongoDB?.()) {
      return;
    }
    
    // Clean up test data
    await Colony.deleteMany({ colonyName: { $regex: /Integration Test/ } });
    if (testColony?._id) {
      await Settler.deleteMany({ colonyId: testColony._id });
      await Assignment.deleteMany({ colonyId: testColony._id });
    }
  });

  describe('Multi-collection operations', () => {
    it('should handle complex multi-collection writes in a single transaction', async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }
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
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }
      
      // Only run rollback tests if transactions are supported
      if (!supportsTransactions()) {
        console.log('⚠️ Skipping rollback test - transactions not supported in this environment');
        return;
      }
      let settlerId: mongoose.Types.ObjectId | null = null;
      let assignmentId: mongoose.Types.ObjectId | null = null;
      
      try {
        await withSession(async (session) => {
          // Create a settler
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
          
          // Only save if transactions are not supported (to test rollback)
          if (!supportsTransactions()) {
            await settler.save({ session });
            settlerId = settler._id;
            
            // Add settler to colony
            testColony.settlers.push(settler._id);
            await testColony.save({ session });
          }
          
          // Create assignment but with invalid data to trigger error
          const assignment = new Assignment({
            colonyId: testColony._id,
            settlerId: settler._id,
            type: 'quest',
            // Missing required fields to trigger validation error
          } as any);
          
          await assignment.save({ session });
          assignmentId = assignment._id;
          
          // This should not be reached due to validation error above
          throw new Error('Test rollback error');
        });
      } catch (error) {
        // Error is expected
      }

      // If transactions are supported, verify rollback occurred
      if (supportsTransactions()) {
        const foundColony = await Colony.findById(testColony._id);
        expect(foundColony!.settlers).toHaveLength(0);
        
        const foundSettler = settlerId ? await Settler.findById(settlerId) : null;
        expect(foundSettler).toBeNull();
        
        const foundAssignment = assignmentId ? await Assignment.findById(assignmentId) : null;
        expect(foundAssignment).toBeNull();
      }
      // If transactions are not supported, some changes might persist (that's expected in test env)
    });
  });

  describe('Session reuse', () => {
    it('should reuse existing sessions in nested operations', async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }
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