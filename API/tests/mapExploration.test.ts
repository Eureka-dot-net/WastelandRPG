import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { Colony } from '../src/models/Player/Colony';
import { UserMapTile } from '../src/models/Player/UserMapTile';
import { Assignment } from '../src/models/Player/Assignment';
import { MapTile } from '../src/models/Server/MapTile';
import { Settler } from '../src/models/Player/Settler';
import { createTestUserAndColony } from './utils';

describe('Map Exploration Flow', () => {
  let token: string;
  let colony: any;
  let user: any;
  let settler: any;

  beforeEach(async () => {
    // Create test user and colony
    const testData = await createTestUserAndColony();
    user = testData.user;
    colony = testData.colony;
    token = testData.token;
    
    // Create a settler for exploration
    settler = new Settler({
      colonyId: colony._id,
      name: 'Test Explorer',
      nameId: 'test-explorer',
      status: 'idle',
      stats: { 
        health: 100, 
        stamina: 100, 
        morale: 100, 
        speed: 10,
        resilience: 10,
        intelligence: 10,
        strength: 10
      },
      skills: { 
        scavenging: 10, 
        construction: 10, 
        farming: 10, 
        combat: 10, 
        survival: 10,
        engineering: 10,
        medical: 10,
        crafting: 10
      },
      traits: [],
      backstory: 'A test explorer'
    });
    await settler.save();
  });

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Colony.deleteMany({});
    await UserMapTile.deleteMany({});
    await Assignment.deleteMany({});
    await MapTile.deleteMany({});
    await Settler.deleteMany({});
  });

  test('should create UserMapTile with isExplored=false when exploration starts', async () => {
    // Start exploration at adjacent tile
    const explorationRes = await request(app)
      .post(`/api/colonies/${colony._id}/map/start?x=1&y=0&settlerId=${settler._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(explorationRes.body.state).toBe('in-progress');

    // Check that UserMapTile was created with isExplored=false
    const userMapTile = await UserMapTile.findOne({
      colonyId: colony._id.toString()
    });

    expect(userMapTile).toBeTruthy();
    expect(userMapTile!.isExplored).toBe(false);
    expect(userMapTile!.distanceFromHomestead).toBe(1);
    expect(userMapTile!.explorationTime).toBeGreaterThan(0);
    expect(userMapTile!.lootMultiplier).toBeGreaterThanOrEqual(1);
  });

  test('should mark UserMapTile as explored when exploration completes', async () => {
    // Start exploration
    await request(app)
      .post(`/api/colonies/${colony._id}/map/start?x=1&y=0&settlerId=${settler._id}`)
      .set('Authorization', `Bearer ${token}`);

    // Get the created assignment
    const assignment = await Assignment.findOne({ colonyId: colony._id });
    expect(assignment).toBeTruthy();

    // Simulate exploration completion by updating the completedAt time
    assignment!.completedAt = new Date(Date.now() - 1000); // 1 second ago
    await assignment!.save();

    // Trigger completion middleware by making any authenticated request
    await request(app)
      .get(`/api/colonies/${colony._id}/map?x=0&y=0`)
      .set('Authorization', `Bearer ${token}`);

    // Check that UserMapTile is now marked as explored
    const userMapTile = await UserMapTile.findOne({
      colonyId: colony._id.toString()
    });

    expect(userMapTile).toBeTruthy();
    expect(userMapTile!.isExplored).toBe(true);
  });

  test('should show assignments on map grid even for unexplored tiles', async () => {
    // Start exploration
    await request(app)
      .post(`/api/colonies/${colony._id}/map/start?x=1&y=0&settlerId=${settler._id}`)
      .set('Authorization', `Bearer ${token}`);

    // Get map grid - should show the assignment even though tile isn't explored yet
    const mapRes = await request(app)
      .get(`/api/colonies/${colony._id}/map?x=0&y=0`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(mapRes.body.grid).toBeTruthy();
    expect(mapRes.body.grid.size).toBe(5);

    // Find the tile with the assignment (should be at grid position [2, 3] for coordinate (1, 0))
    const tiles = mapRes.body.grid.tiles.flat();
    const tileWithAssignment = tiles.find((tile: any) => tile.assignments?.length > 0);
    
    expect(tileWithAssignment).toBeTruthy();
    expect(tileWithAssignment.assignments).toHaveLength(1);
    expect(tileWithAssignment.assignments[0].type).toBe('exploration');
    expect(tileWithAssignment.assignments[0].state).toBe('in-progress');
  });

  test('should prevent exploration of tiles not adjacent to explored ones', async () => {
    // Try to explore a tile that's not adjacent to homestead or explored tiles
    const explorationRes = await request(app)
      .post(`/api/colonies/${colony._id}/map/start?x=3&y=3&settlerId=${settler._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(explorationRes.body.error).toContain('Cannot explore this tile');
  });

  test('should allow exploration of tiles adjacent to explored ones', async () => {
    // First, explore a tile adjacent to homestead
    await request(app)
      .post(`/api/colonies/${colony._id}/map/start?x=1&y=0&settlerId=${settler._id}`)
      .set('Authorization', `Bearer ${token}`);

    // Complete the exploration
    const assignment = await Assignment.findOne({ colonyId: colony._id });
    assignment!.completedAt = new Date(Date.now() - 1000);
    await assignment!.save();

    // Trigger completion
    await request(app)
      .get(`/api/colonies/${colony._id}/map?x=0&y=0`)
      .set('Authorization', `Bearer ${token}`);

    // Free up the settler
    await Settler.findByIdAndUpdate(settler._id, { status: 'idle' });

    // Now should be able to explore a tile adjacent to the newly explored one
    const secondExploration = await request(app)
      .post(`/api/colonies/${colony._id}/map/start?x=2&y=0&settlerId=${settler._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(secondExploration.body.state).toBe('in-progress');
  });

  test('should use stored distance and loot values in preview', async () => {
    // Start and complete an exploration to create UserMapTile with stored values
    await request(app)
      .post(`/api/colonies/${colony._id}/map/start?x=2&y=0&settlerId=${settler._id}`)
      .set('Authorization', `Bearer ${token}`);

    const assignment = await Assignment.findOne({ colonyId: colony._id });
    assignment!.completedAt = new Date(Date.now() - 1000);
    await assignment!.save();

    await request(app)
      .get(`/api/colonies/${colony._id}/map?x=0&y=0`)
      .set('Authorization', `Bearer ${token}`);

    await Settler.findByIdAndUpdate(settler._id, { status: 'idle' });

    // Create a new settler for preview
    const newSettler = new Settler({
      colonyId: colony._id,
      name: 'Test Preview',
      nameId: 'test-preview',
      status: 'idle',
      stats: { 
        health: 100, 
        stamina: 100, 
        morale: 100, 
        speed: 10,
        resilience: 10,
        intelligence: 10,
        strength: 10
      },
      skills: { 
        scavenging: 10, 
        construction: 10, 
        farming: 10, 
        combat: 10, 
        survival: 10,
        engineering: 10,
        medical: 10,
        crafting: 10
      },
      traits: [],
      backstory: 'A test previewer'
    });
    await newSettler.save();

    // Get preview for the already explored tile - should use stored values
    const previewRes = await request(app)
      .get(`/api/colonies/${colony._id}/map/preview?x=2&y=0&settlerId=${newSettler._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(previewRes.body.preview).toBeTruthy();
    expect(previewRes.body.preview.alreadyExplored).toBe(true);
    expect(previewRes.body.preview.duration).toBeGreaterThan(300000); // Should reflect distance multiplier
  });
});