import request from 'supertest';
import { app } from '../src/app';
import { createTestUserAndColony } from './utils';
import { Colony } from '../src/models/Player/Colony';
import { Inventory } from '../src/models/Player/Inventory';
import { Settler } from '../src/models/Player/Settler';
import { Assignment } from '../src/models/Player/Assignment';

describe('Crafting endpoints', () => {
  let token: string;
  let colony: any;
  let settler: any;

  beforeAll(async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      console.log('Skipping MongoDB-dependent setup for Crafting endpoints tests');
      return;
    }

    // Create test user and colony
    const result = await createTestUserAndColony({
      userProps: { email: 'crafting@test.com', password: 'password123' },
      colonyProps: {
        serverId: 'harbor',
        serverName: 'Harbor Server',
        serverType: 'PvE',
        colonyName: 'Test Crafting Colony',
        level: 1,
        spiralIndex: 0,
        spiralLayer: 0,
        spiralPosition: 0,
        spiralDirection: 0,
        homesteadLocation: { x: 0, y: 0 }
      }
    });
    token = result.token;
    colony = result.colony;

    // Create a test settler for crafting
    settler = new Settler({
      colonyId: colony._id,
      isActive: true,
      nameId: 'test_crafter',
      name: 'Test Crafter',
      backstory: 'A skilled crafter',
      isFemale: false,
      status: 'idle',
      energy: 100,
      hunger: 0,
      interests: [],
      stats: {
        speed: 10,
        intelligence: 15,
        strength: 10,
        resilience: 10
      },
      skills: {
        scavenging: 5,
        combat: 5,
        farming: 5,
        crafting: 15,
        medical: 5,
        engineering: 5
      },
      traits: [],
      inventory: []
    });
    await settler.save();

    // Create inventory with crafting materials
    const inventory = new Inventory({
      colonyId: colony._id,
      items: [
        {
          itemId: 'wood',
          name: 'Wood',
          icon: 'GiWoodStick',
          quantity: 10,
          type: 'base',
          properties: { stackable: true, weight: 3 }
        },
        {
          itemId: 'scrap',
          name: 'Scrap Metal',
          icon: 'GiHorseshoe',
          quantity: 5,
          type: 'currency',
          properties: { stackable: true, weight: 2 }
        }
      ]
    });
    await inventory.save();
  });

  beforeEach(async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      return;
    }
    
    // Reset settler status before each test
    await Settler.findByIdAndUpdate(settler._id, { status: 'idle' });
    
    // Reset inventory to original state
    await Inventory.findOneAndUpdate(
      { colonyId: colony._id },
      {
        $set: {
          items: [
            {
              itemId: 'wood',
              name: 'Wood',
              icon: 'GiWoodStick',
              quantity: 10,
              type: 'base',
              properties: { stackable: true, weight: 3 }
            },
            {
              itemId: 'scrap',
              name: 'Scrap Metal',
              icon: 'GiHorseshoe',
              quantity: 5,
              type: 'currency',
              properties: { stackable: true, weight: 2 }
            }
          ]
        }
      }
    );
  });

  describe('GET /api/colonies/:colonyId/crafting/recipes', () => {
    it('should return all recipes with availability status', async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        console.log('Skipping test due to no MongoDB');
        return;
      }

      const res = await request(app)
        .get(`/api/colonies/${colony._id}/crafting/recipes`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.recipes).toBeDefined();
      expect(Array.isArray(res.body.recipes)).toBe(true);

      // Find the spear recipe (should be craftable with our materials)
      const spearRecipe = res.body.recipes.find((r: any) => r.itemId === 'spear');
      expect(spearRecipe).toBeDefined();
      expect(spearRecipe.canCraft).toBe(true);
      expect(spearRecipe.recipe).toEqual([
        { itemId: 'wood', quantity: 4 },
        { itemId: 'scrap', quantity: 2 }
      ]);
    });

    it('should return 400 for invalid colonyId', async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        console.log('Skipping test due to no MongoDB');
        return;
      }

      const res = await request(app)
        .get('/api/colonies/invalid/crafting/recipes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid colonyId');
    });
  });

  describe('POST /api/colonies/:colonyId/crafting/start-recipe', () => {
    it('should start crafting a spear successfully', async () => {
      if ((global as any).skipIfNoMongoDB?.()) {
        console.log('Skipping test due to no MongoDB');
        return;
      }
      const res = await request(app)
        .post(`/api/colonies/${colony._id}/crafting/start-recipe`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId: settler._id,
          itemId: 'spear'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.assignmentId).toBeDefined();
      expect(res.body.settlerId).toBe(settler._id.toString());
      expect(res.body.itemId).toBe('spear');
      expect(res.body.duration).toBeGreaterThan(0);
      expect(res.body.completedAt).toBeDefined();
      expect(res.body.adjustments).toBeDefined();

      // Check that materials were consumed
      const inventory = await Inventory.findOne({ colonyId: colony._id });
      const wood = inventory!.items.find(item => item.itemId === 'wood');
      const scrap = inventory!.items.find(item => item.itemId === 'scrap');
      
      expect(wood!.quantity).toBe(6); // 10 - 4 = 6
      expect(scrap!.quantity).toBe(3); // 5 - 2 = 3

      // Check that settler is now crafting
      const updatedSettler = await Settler.findById(settler._id);
      expect(updatedSettler!.status).toBe('crafting');

      // Check that assignment was created
      const assignment = await Assignment.findById(res.body.assignmentId);
      expect(assignment).toBeDefined();
      expect(assignment!.type).toBe('crafting');
      expect(assignment!.state).toBe('in-progress');
      expect(assignment!.plannedRewards).toEqual({ spear: 1 });
    });

    it('should fail with insufficient materials', async () => {
      // Try to craft something that requires more materials than we have
      const res = await request(app)
        .post(`/api/colonies/${colony._id}/crafting/start-recipe`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId: settler._id,
          itemId: 'spear'
        });

      // First crafting should succeed
      expect(res.status).toBe(200);

      // Try to craft another spear (should fail due to insufficient materials)
      const res2 = await request(app)
        .post(`/api/colonies/${colony._id}/crafting/start-recipe`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId: settler._id,
          itemId: 'spear'
        });

      expect(res2.status).toBe(400);
      expect(res2.body.error).toContain('Insufficient materials');
    });

    it('should fail if settler is busy', async () => {
      // Set settler to busy status
      await Settler.findByIdAndUpdate(settler._id, { status: 'working' });

      const res = await request(app)
        .post(`/api/colonies/${colony._id}/crafting/start-recipe`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId: settler._id,
          itemId: 'spear'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('currently working');
    });

    it('should fail for non-craftable item', async () => {
      const res = await request(app)
        .post(`/api/colonies/${colony._id}/crafting/start-recipe`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId: settler._id,
          itemId: 'wood' // Wood doesn't have a recipe
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Item not found or not craftable');
    });

    it('should fail with invalid settlerId', async () => {
      const res = await request(app)
        .post(`/api/colonies/${colony._id}/crafting/start-recipe`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId: 'invalid',
          itemId: 'spear'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid settlerId');
    });
  });

  describe('POST /api/colonies/:colonyId/crafting/preview-crafting', () => {
    it('should return crafting preview with adjustments', async () => {
      const res = await request(app)
        .post(`/api/colonies/${colony._id}/crafting/preview-crafting`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId: settler._id,
          itemId: 'spear'
        });

      expect(res.status).toBe(200);
      expect(res.body.settlerId).toBe(settler._id.toString());
      expect(res.body.settlerName).toBe('Test Crafter');
      expect(res.body.itemId).toBe('spear');
      expect(res.body.itemName).toBe('Spear');
      expect(res.body.baseDuration).toBeGreaterThan(0);
      expect(res.body.adjustments).toBeDefined();
      expect(res.body.adjustments.adjustedDuration).toBeGreaterThan(0);
      expect(res.body.canCraft).toBe(true);
      expect(res.body.recipe).toEqual([
        { itemId: 'wood', quantity: 4 },
        { itemId: 'scrap', quantity: 2 }
      ]);
    });

    it('should show canCraft false for busy settler', async () => {
      // Set settler to busy status
      await Settler.findByIdAndUpdate(settler._id, { status: 'working' });

      const res = await request(app)
        .post(`/api/colonies/${colony._id}/crafting/preview-crafting`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId: settler._id,
          itemId: 'spear'
        });

      expect(res.status).toBe(200);
      expect(res.body.canCraft).toBe(false);
      expect(res.body.reason).toContain('currently working');
    });

    it('should fail for non-craftable item', async () => {
      const res = await request(app)
        .post(`/api/colonies/${colony._id}/crafting/preview-crafting`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId: settler._id,
          itemId: 'wood'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Item not found or not craftable');
    });
  });

  describe('Crafting completion integration', () => {
    it('should complete crafting assignment and add item to colony inventory', async () => {
      // Start crafting
      const startRes = await request(app)
        .post(`/api/colonies/${colony._id}/crafting/start-recipe`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          settlerId: settler._id,
          itemId: 'spear'
        });

      expect(startRes.status).toBe(200);

      // Get the assignment and manually complete it
      const assignment = await Assignment.findById(startRes.body.assignmentId);
      expect(assignment).toBeDefined();

      // Set completion time to past
      assignment!.completedAt = new Date(Date.now() - 1000);
      await assignment!.save();

      // Trigger completion by making any API call that uses updateCompletedTasks middleware
      const completeRes = await request(app)
        .get(`/api/colonies/${colony._id}/crafting/recipes`)
        .set('Authorization', `Bearer ${token}`);

      expect(completeRes.status).toBe(200);

      // Check that assignment is completed
      const completedAssignment = await Assignment.findById(startRes.body.assignmentId);
      expect(completedAssignment!.state).toBe('completed');

      // Check that settler is idle again
      const settlerAfter = await Settler.findById(settler._id);
      expect(settlerAfter!.status).toBe('idle');

      // Check that spear was added to colony inventory
      const inventory = await Inventory.findOne({ colonyId: colony._id });
      const spear = inventory!.items.find(item => item.itemId === 'spear');
      expect(spear).toBeDefined();
      expect(spear!.quantity).toBe(1);
      expect(spear!.name).toBe('Spear');
    });
  });
});