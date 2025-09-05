import { createUserMapTile, hasColonyExploredTile, markUserMapTileExplored } from '../src/utils/mapUtils';
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
      icon: 'test-icon',
      exploredAt: new Date()
    });

    // Create UserMapTile using utility function
    const userMapTile = await createUserMapTile(
      mapTile._id.toString(), 
      'test-colony-456',
      10, // distance from homestead
      300000, // exploration time
      1.5, // loot multiplier
      [{ item: 'scrap', amount: 5 }] // discovered loot
    );

    expect(userMapTile.colonyId).toBe('test-colony-456');
    expect(userMapTile.serverTile.toString()).toBe(mapTile._id.toString());
    expect(userMapTile.exploredAt).toBeDefined();
    expect(userMapTile.isExplored).toBe(false); // Initially not explored
    expect(userMapTile.distanceFromHomestead).toBe(10);
    expect(userMapTile.explorationTime).toBe(300000);
    expect(userMapTile.lootMultiplier).toBe(1.5);
    expect(userMapTile.discoveredLoot).toHaveLength(1);
    expect(userMapTile.discoveredLoot?.[0].item).toBe('scrap');
    expect(userMapTile.discoveredLoot?.[0].amount).toBe(5);
  });

  test('hasColonyExploredTile should return correct exploration status', async () => {
    // Create a test MapTile
    const mapTile = await MapTile.create({
      serverId: 'test-server',
      x: 3,
      y: 7,
      terrain: 'forest',
      icon: 'forest-icon',
      exploredAt: new Date()
    });

    // Initially, colony has not explored tile
    let hasExplored = await hasColonyExploredTile(
      mapTile._id.toString(),
      'test-colony-789'
    );
    expect(hasExplored).toBe(false);

    // Create UserMapTile (exploration started but not completed)
    await createUserMapTile(
      mapTile._id.toString(), 
      'test-colony-789',
      5, // distance
      300000, // time
      1.2, // multiplier
      [{ item: 'wood', amount: 3 }] // loot
    );

    // Still not fully explored (isExplored=false by default)
    hasExplored = await hasColonyExploredTile(
      mapTile._id.toString(),
      'test-colony-789'
    );
    expect(hasExplored).toBe(false);

    // Mark as explored (exploration completed)
    await markUserMapTileExplored(
      mapTile._id.toString(),
      'test-colony-789'
    );

    // Now colony has fully explored tile
    hasExplored = await hasColonyExploredTile(
      mapTile._id.toString(),
      'test-colony-789'
    );
    expect(hasExplored).toBe(true);
  });

  test('markUserMapTileExplored should properly mark tile as explored', async () => {
    // Create a test MapTile
    const mapTile = await MapTile.create({
      serverId: 'test-server',
      x: 1,
      y: 2,
      terrain: 'desert',
      icon: 'desert-icon',
      exploredAt: new Date()
    });

    // Create UserMapTile (exploration starts)
    const userMapTile1 = await createUserMapTile(
      mapTile._id.toString(),
      'test-colony-abc',
      3, // distance
      300000, // time
      1.1, // multiplier
      [{ item: 'sand', amount: 2 }] // loot
    );

    expect(userMapTile1.isExplored).toBe(false);

    // Mark as explored (exploration completes)
    const userMapTile2 = await markUserMapTileExplored(
      mapTile._id.toString(),
      'test-colony-abc'
    );

    expect(userMapTile2?.isExplored).toBe(true);
    expect(userMapTile1._id.toString()).toBe(userMapTile2?._id.toString());

    // Should only be one record in the database
    const count = await UserMapTile.countDocuments({
      serverTile: mapTile._id,
      colonyId: 'test-colony-abc'
    });
    expect(count).toBe(1);
  });
});