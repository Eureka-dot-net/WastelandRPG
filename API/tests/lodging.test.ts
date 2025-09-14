import request from 'supertest';
import { app } from '../src/app';
import { createTestUserAndColony } from './utils';
import { Lodging } from '../src/models/Player/Lodging';
import { Settler } from '../src/models/Player/Settler';
import { Assignment } from '../src/models/Player/Assignment';
import mongoose from 'mongoose';

describe('Lodging endpoints', () => {
  let token: string;
  let userId: mongoose.Types.ObjectId;
  let colony: any;
  let settlerId: string;

  const serverId = 'harbor';
  const colonyName = 'Lodging Test Colony';

  beforeAll(async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      console.log('Skipping MongoDB-dependent setup for Lodging endpoints tests');
      return;
    }

    const result = await createTestUserAndColony({
      userProps: { email: 'lodging@test.com', password: 'password123' },
      colonyProps: { 
        serverId, 
        serverName: 'Test Server',
        colonyName, 
        level: 1, 
        serverType: 'PvE',
        spiralIndex: 0,
        spiralLayer: 0,
        spiralPosition: 0,
        spiralDirection: 0,
        homesteadLocation: { x: 0, y: 0 }
      }
    });
    userId = result.user._id;
    colony = result.colony;
    token = result.token;

    // Onboard settlers to get test subjects
    const res = await request(app)
      .post(`/api/colonies/${colony._id}/settlers/onboard`)
      .set('Authorization', `Bearer ${token}`);
    
    if (res.body.settlers && res.body.settlers.length > 0) {
      settlerId = res.body.settlers[0]._id;
    } else {
      console.warn('Failed to onboard settlers:', res.body);
      // Create a manual settler for testing
      const { Settler } = require('../src/models/Player/Settler');
      const settler = new Settler({
        colonyId: colony._id,
        isActive: true,
        nameId: 'test-settler',
        name: 'Test Settler',
        backstory: 'Test settler backstory',
        isFemale: false,
        stats: { 
          strength: 5, 
          speed: 5, 
          intelligence: 5, 
          resilience: 5 
        },
        skills: {
          combat: 1,
          scavenging: 1,
          farming: 1,
          crafting: 1,
          medical: 1,
          engineering: 1
        },
        traits: [],
        status: 'idle',
        energy: 50,
        hunger: 0,
        maxCarrySlots: 5,
        carry: []
      });
      const savedSettler = await settler.save();
      settlerId = savedSettler._id.toString();
    }
  });

  afterAll(async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      return;
    }
    
    // Clean up test data
    await Promise.all([
      Lodging.deleteMany({ colonyId: colony._id }),
      Assignment.deleteMany({ colonyId: colony._id })
    ]);
  });

  describe('GET /api/colonies/:colonyId/lodging/beds', () => {
    beforeEach(async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }
      // Clean lodging before each test
      await Lodging.deleteMany({ colonyId: colony._id });
    });

    it('should create and return default lodging when none exists', async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }

      const res = await request(app)
        .get(`/api/colonies/${colony._id}/lodging/beds`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('lodging');
      expect(res.body.lodging).toHaveProperty('_id');
      expect(res.body.lodging.colonyId).toBe(colony._id.toString());
      expect(res.body.lodging.maxBeds).toBe(3);
      expect(res.body.lodging.beds).toHaveLength(3);
      expect(res.body.lodging.beds[0]).toHaveProperty('_id');
      expect(res.body.lodging.beds[0].level).toBe(1);
    });

    it('should return existing lodging', async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }

      // Create existing lodging
      const existingLodging = new Lodging({
        colonyId: colony._id,
        maxBeds: 2,
        beds: [
          { level: 2 } as any,
          { level: 1 } as any
        ]
      });
      await existingLodging.save();

      const res = await request(app)
        .get(`/api/colonies/${colony._id}/lodging/beds`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.lodging.maxBeds).toBe(2);
      expect(res.body.lodging.beds).toHaveLength(2);
      expect(res.body.lodging.beds[0].level).toBe(2);
      expect(res.body.lodging.beds[1].level).toBe(1);
    });

    it('should add missing beds to match maxBeds', async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }

      // Create lodging with fewer beds than maxBeds
      const existingLodging = new Lodging({
        colonyId: colony._id,
        maxBeds: 4,
        beds: [
          { level: 2 } as any
        ]
      });
      await existingLodging.save();

      const res = await request(app)
        .get(`/api/colonies/${colony._id}/lodging/beds`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.lodging.maxBeds).toBe(4);
      expect(res.body.lodging.beds).toHaveLength(4);
      expect(res.body.lodging.beds[0].level).toBe(2); // existing bed
      expect(res.body.lodging.beds[1].level).toBe(1); // new bed
      expect(res.body.lodging.beds[2].level).toBe(1); // new bed
      expect(res.body.lodging.beds[3].level).toBe(1); // new bed
    });

    it('should reject invalid colonyId', async () => {
      const res = await request(app)
        .get('/api/colonies/invalid-id/lodging/beds')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid colonyId');
    });
  });

  describe('POST /api/colonies/:colonyId/lodging/start-sleep', () => {
    beforeEach(async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }
      // Clean assignments and ensure settler is idle with low energy
      await Assignment.deleteMany({ colonyId: colony._id });
      await Settler.findByIdAndUpdate(settlerId, { 
        status: 'idle', 
        energy: 30,
        energyLastUpdated: new Date() 
      });
    });

    it('should start sleep assignment successfully', async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }

      const res = await request(app)
        .post(`/api/colonies/${colony._id}/lodging/start-sleep`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId,
          bedLevel: 1
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('assignmentId');
      expect(res.body).toHaveProperty('duration');
      expect(res.body).toHaveProperty('completedAt');
      expect(res.body.settlerId).toBe(settlerId);

      // Verify assignment was created
      const assignment = await Assignment.findById(res.body.assignmentId);
      expect(assignment).toBeTruthy();
      expect(assignment!.type).toBe('resting');
      expect(assignment!.state).toBe('in-progress');
      expect(assignment!.settlerId!.toString()).toBe(settlerId);

      // Verify settler status changed
      const settler = await Settler.findById(settlerId);
      expect(settler!.status).toBe('resting');
    });

    it('should reject if settler already has full energy', async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }

      // Set settler to full energy
      await Settler.findByIdAndUpdate(settlerId, { 
        energy: 100,
        energyLastUpdated: new Date() 
      });

      const res = await request(app)
        .post(`/api/colonies/${colony._id}/lodging/start-sleep`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId,
          bedLevel: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Settler already has full energy and does not need to sleep');
    });

    it('should reject if settler is not idle', async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }

      // Set settler to exploring status
      await Settler.findByIdAndUpdate(settlerId, { 
        status: 'exploring',
        energy: 30
      });

      const res = await request(app)
        .post(`/api/colonies/${colony._id}/lodging/start-sleep`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId,
          bedLevel: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Settler is currently exploring and cannot be assigned to sleep');
    });

    it('should reject missing settlerId', async () => {
      const res = await request(app)
        .post(`/api/colonies/${colony._id}/lodging/start-sleep`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          bedLevel: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('settlerId is required');
    });

    it('should reject invalid bedLevel', async () => {
      const res = await request(app)
        .post(`/api/colonies/${colony._id}/lodging/start-sleep`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId,
          bedLevel: 0
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('bedLevel must be a positive number');
    });

    it('should reject invalid settlerId', async () => {
      const res = await request(app)
        .post(`/api/colonies/${colony._id}/lodging/start-sleep`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId: 'invalid-id',
          bedLevel: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid settlerId');
    });

    it('should reject non-existent settler', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .post(`/api/colonies/${colony._id}/lodging/start-sleep`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId: fakeId.toString(),
          bedLevel: 1
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Settler not found');
    });
  });

  describe('POST /api/colonies/:colonyId/lodging/preview-sleep-batch', () => {
    beforeEach(async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }
      // Ensure settler is idle with low energy
      await Settler.findByIdAndUpdate(settlerId, { 
        status: 'idle', 
        energy: 40,
        energyLastUpdated: new Date() 
      });
    });

    it('should preview sleep durations for multiple settlers', async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }

      // Create another settler manually since onboard may not work
      const settler2 = new Settler({
        colonyId: colony._id,
        isActive: true,
        nameId: 'test-settler-2',
        name: 'Test Settler 2',
        backstory: 'Test settler 2 backstory',
        isFemale: true,
        stats: { 
          strength: 5, 
          speed: 5, 
          intelligence: 5, 
          resilience: 5 
        },
        skills: {
          combat: 1,
          scavenging: 1,
          farming: 1,
          crafting: 1,
          medical: 1,
          engineering: 1
        },
        traits: [],
        status: 'idle',
        energy: 60,
        hunger: 0,
        maxCarrySlots: 5,
        carry: [],
        energyLastUpdated: new Date()
      });
      const savedSettler2 = await settler2.save();
      const settlerId2 = savedSettler2._id.toString();

      const res = await request(app)
        .post(`/api/colonies/${colony._id}/lodging/preview-sleep-batch`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlers: [
            { settlerId, bedType: 1 },
            { settlerId, bedType: 2 },
            { settlerId2, bedType: 1 }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
      expect(res.body.results).toHaveLength(3);

      const result1 = res.body.results[0];
      expect(result1.settlerId).toBe(settlerId);
      expect(result1.bedType).toBe(1);
      expect(result1.canSleep).toBe(true);
      expect(result1.duration).toBeGreaterThan(0);

      const result2 = res.body.results[1];
      expect(result2.settlerId).toBe(settlerId);
      expect(result2.bedType).toBe(2);
      expect(result2.canSleep).toBe(true);
      expect(result2.duration).toBeLessThan(result1.duration); // Better bed = less time

      const result3 = res.body.results[2];
      expect(result3.settlerId).toBe(settlerId2);
      expect(result3.bedType).toBe(1);
      expect(result3.canSleep).toBe(true);
      expect(result3.duration).toBeLessThan(result1.duration); // Higher energy = less time
    });

    it('should handle settlers with full energy', async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }

      await Settler.findByIdAndUpdate(settlerId, { 
        energy: 100,
        energyLastUpdated: new Date() 
      });

      const res = await request(app)
        .post(`/api/colonies/${colony._id}/lodging/preview-sleep-batch`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlers: [
            { settlerId, bedType: 1 }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.results[0].canSleep).toBe(false);
      expect(res.body.results[0].reason).toBe('Settler already has full energy');
      expect(res.body.results[0].duration).toBe(0);
    });

    it('should handle settlers who are not idle', async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        return;
      }

      await Settler.findByIdAndUpdate(settlerId, { 
        status: 'exploring',
        energy: 40
      });

      const res = await request(app)
        .post(`/api/colonies/${colony._id}/lodging/preview-sleep-batch`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlers: [
            { settlerId, bedType: 1 }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.results[0].canSleep).toBe(false);
      expect(res.body.results[0].reason).toBe('Settler is currently exploring');
    });

    it('should reject empty settlers array', async () => {
      const res = await request(app)
        .post(`/api/colonies/${colony._id}/lodging/preview-sleep-batch`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlers: []
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('settlers array is required and must not be empty');
    });

    it('should reject invalid settler entries', async () => {
      const res = await request(app)
        .post(`/api/colonies/${colony._id}/lodging/preview-sleep-batch`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlers: [
            { settlerId: 'invalid-id', bedType: 1 }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Each settler entry must have a valid settlerId');
    });

    it('should reject invalid bedType', async () => {
      const res = await request(app)
        .post(`/api/colonies/${colony._id}/lodging/preview-sleep-batch`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlers: [
            { settlerId, bedType: 0 }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Each settler entry must have a valid bedType (positive number)');
    });
  });
});