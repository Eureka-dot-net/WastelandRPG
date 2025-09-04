import { createUserMapTile, hasColonyExploredTile, createOrGetUserMapTile } from '../src/utils/mapUtils';
import { UserMapTile } from '../src/models/Player/UserMapTile';
import { MapTile } from '../src/models/Server/MapTile';

describe('MapUtils UserMapTile functions', () => {
  beforeEach(async () => {
    // Clear the collections before each test
    await UserMapTile.deleteMany({});
    await MapTile.deleteMany({});
  });

  test('createUserMapTile should create a new UserMapTile', async () => {
    // Create a test MapTile first
    const mapTile = await MapTile.create({
      serverId: 'test-server',
      x: 5,
      y: 10,
      terrain: 'wasteland',
      exploredBy: ['system'],
      exploredAt: new Date()
    });

    // Create UserMapTile using utility function
    const userMapTile = await createUserMapTile(
      mapTile._id.toString(), 
      'test-colony-456'
    );

    expect(userMapTile.colonyId).toBe('test-colony-456');
    expect(userMapTile.serverTile.toString()).toBe(mapTile._id.toString());
    expect(userMapTile.exploredAt).toBeDefined();
  });

  test('hasColonyExploredTile should return correct exploration status', async () => {
    // Create a test MapTile
    const mapTile = await MapTile.create({
      serverId: 'test-server',
      x: 3,
      y: 7,
      terrain: 'forest',
      exploredBy: ['system'],
      exploredAt: new Date()
    });

    // Initially, colony has not explored tile
    let hasExplored = await hasColonyExploredTile(
      mapTile._id.toString(),
      'test-colony-789'
    );
    expect(hasExplored).toBe(false);

    // Create UserMapTile
    await createUserMapTile(mapTile._id.toString(), 'test-colony-789');

    // Now colony has explored tile
    hasExplored = await hasColonyExploredTile(
      mapTile._id.toString(),
      'test-colony-789'
    );
    expect(hasExplored).toBe(true);
  });

  test('createOrGetUserMapTile should not create duplicates', async () => {
    // Create a test MapTile
    const mapTile = await MapTile.create({
      serverId: 'test-server',
      x: 1,
      y: 2,
      terrain: 'desert',
      exploredBy: ['system'],
      exploredAt: new Date()
    });

    // First call should create
    const userMapTile1 = await createOrGetUserMapTile(
      mapTile._id.toString(),
      'test-colony-abc'
    );

    // Second call should return existing
    const userMapTile2 = await createOrGetUserMapTile(
      mapTile._id.toString(),
      'test-colony-abc'
    );

    expect(userMapTile1._id.toString()).toBe(userMapTile2._id.toString());

    // Should only be one record in the database
    const count = await UserMapTile.countDocuments({
      serverTile: mapTile._id,
      colonyId: 'test-colony-abc'
    });
    expect(count).toBe(1);
  });
});