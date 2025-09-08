import { UserMapTile } from '../src/models/Player/UserMapTile';
import { MapTile } from '../src/models/Server/MapTile';
import mongoose from 'mongoose';

describe('UserMapTile functionality', () => {
  beforeEach(async () => {
    // Clear the collections before each test
    await UserMapTile.deleteMany({});
    await MapTile.deleteMany({});
  });

  test('should create UserMapTile and enforce unique constraint', async () => {
    // Create a test MapTile
    const mapTile = await MapTile.create({
      serverId: 'test-server',
      x: 0,
      y: 0,
      terrain: 'center',
      icon: 'GiHut', // Required field
      exploredAt: new Date()
    });

    // Create a UserMapTile
    const userMapTile = await UserMapTile.create({
      serverTile: mapTile._id,
      x: mapTile.x, // Required field
      y: mapTile.y, // Required field
      terrain: mapTile.terrain, // Required field
      icon: mapTile.icon, // Required field
      colonyId: 'test-colony-123',
      distanceFromHomestead: 0, // Required field
      explorationTime: 0, // Required field
      lootMultiplier: 1.0, // Required field
      exploredAt: new Date()
    });

    expect(userMapTile.colonyId).toBe('test-colony-123');
    expect(userMapTile.serverTile.toString()).toBe(mapTile._id.toString());

    // Test finding UserMapTile
    const found = await UserMapTile.findOne({ 
      serverTile: mapTile._id, 
      colonyId: 'test-colony-123' 
    });
    expect(found).toBeTruthy();

    // Test unique constraint
    await expect(UserMapTile.create({
      serverTile: mapTile._id,
      x: mapTile.x,
      y: mapTile.y,
      terrain: mapTile.terrain,
      icon: mapTile.icon,
      colonyId: 'test-colony-123',
      distanceFromHomestead: 0,
      explorationTime: 0,
      lootMultiplier: 1.0,
      exploredAt: new Date()
    })).rejects.toThrow();
  });

  test('should allow different colonies to explore same tile', async () => {
    // Create a test MapTile
    const mapTile = await MapTile.create({
      serverId: 'test-server',
      x: 0,
      y: 0,
      terrain: 'center',
      icon: 'GiHut',
      exploredAt: new Date()
    });

    // Create UserMapTiles for two different colonies
    const userMapTile1 = await UserMapTile.create({
      serverTile: mapTile._id,
      x: mapTile.x,
      y: mapTile.y,
      terrain: mapTile.terrain,
      icon: mapTile.icon,
      colonyId: 'colony-1',
      distanceFromHomestead: 0,
      explorationTime: 0,
      lootMultiplier: 1.0,
      exploredAt: new Date()
    });

    const userMapTile2 = await UserMapTile.create({
      serverTile: mapTile._id,
      x: mapTile.x,
      y: mapTile.y,
      terrain: mapTile.terrain,
      icon: mapTile.icon,
      colonyId: 'colony-2',
      distanceFromHomestead: 0,
      explorationTime: 0,
      lootMultiplier: 1.0,
      exploredAt: new Date()
    });

    expect(userMapTile1.colonyId).toBe('colony-1');
    expect(userMapTile2.colonyId).toBe('colony-2');
    expect(userMapTile1.serverTile.toString()).toBe(mapTile._id.toString());
    expect(userMapTile2.serverTile.toString()).toBe(mapTile._id.toString());
  });
});