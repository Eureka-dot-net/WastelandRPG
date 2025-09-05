import { createOrUpdateUserMapTile, hasColonyExploredTile, markUserMapTileExplored } from '../src/utils/mapUtils';
import { UserMapTile } from '../src/models/Player/UserMapTile';
import { MapTile } from '../src/models/Server/MapTile';

describe('MapUtils UserMapTile functions', () => {
  beforeEach(async () => {
    // Clear the collections before each test
    await UserMapTile.deleteMany({});
    await MapTile.deleteMany({});
  });

  test('createOrUpdateUserMapTile should create a new UserMapTile', async () => {
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
    const userMapTile = await createOrUpdateUserMapTile(
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
    await createOrUpdateUserMapTile(
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

  test('createOrUpdateUserMapTile should properly handle re-exploration', async () => {
    // Create a test MapTile
    const mapTile = await MapTile.create({
      serverId: 'test-server',
      x: 8,
      y: 12,
      terrain: 'mountains',
      icon: 'mountain-icon',
      exploredAt: new Date()
    });

    // First exploration
    const userMapTile1 = await createOrUpdateUserMapTile(
      mapTile._id.toString(),
      'test-colony-reexp',
      4, // distance
      300000, // time
      1.3, // multiplier
      [{ item: 'stone', amount: 4 }] // loot
    );

    expect(userMapTile1.isExplored).toBe(false);
    expect(userMapTile1.distanceFromHomestead).toBe(4);

    // Complete first exploration
    await markUserMapTileExplored(
      mapTile._id.toString(),
      'test-colony-reexp'
    );

    // Verify it's marked as explored
    const hasExplored = await hasColonyExploredTile(
      mapTile._id.toString(),
      'test-colony-reexp'
    );
    expect(hasExplored).toBe(true);

    // Start re-exploration with different parameters
    const userMapTile2 = await createOrUpdateUserMapTile(
      mapTile._id.toString(),
      'test-colony-reexp',
      6, // different distance
      350000, // different time
      1.5, // different multiplier
      [{ item: 'iron', amount: 2 }, { item: 'stone', amount: 3 }] // different loot
    );

    expect(userMapTile2.isExplored).toBe(false); // Reset for new exploration
    expect(userMapTile2.distanceFromHomestead).toBe(6); // Updated
    expect(userMapTile2.explorationTime).toBe(350000); // Updated
    expect(userMapTile2.lootMultiplier).toBe(1.5); // Updated
    expect(userMapTile2.discoveredLoot).toHaveLength(2); // Updated
    expect(userMapTile2._id.toString()).toBe(userMapTile1._id.toString()); // Same record

    // Should still only be one record in the database
    const count = await UserMapTile.countDocuments({
      serverTile: mapTile._id,
      colonyId: 'test-colony-reexp'
    });
    expect(count).toBe(1);
  });

  test('createOrUpdateUserMapTile should prevent starting exploration when already in progress', async () => {
    // Create a test MapTile
    const mapTile = await MapTile.create({
      serverId: 'test-server',
      x: 15,
      y: 20,
      terrain: 'swamp',
      icon: 'swamp-icon',
      exploredAt: new Date()
    });

    // Start first exploration
    await createOrUpdateUserMapTile(
      mapTile._id.toString(),
      'test-colony-inprogress',
      5, // distance
      300000, // time
      1.2, // multiplier
      [{ item: 'mud', amount: 1 }] // loot
    );

    // Try to start another exploration while first is in progress
    await expect(createOrUpdateUserMapTile(
      mapTile._id.toString(),
      'test-colony-inprogress',
      7, // different distance
      400000, // different time
      1.4, // different multiplier
      [{ item: 'plants', amount: 2 }] // different loot
    )).rejects.toThrow('Cannot start exploration - tile is already being explored');
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
    const userMapTile1 = await createOrUpdateUserMapTile(
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