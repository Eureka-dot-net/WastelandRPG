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
      exploredBy: ['system'],
      exploredAt: new Date()
    });

    // Create a UserMapTile
    const userMapTile = await UserMapTile.create({
      serverTile: mapTile._id,
      colonyId: 'test-colony-123',
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
      colonyId: 'test-colony-123',
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
      exploredBy: ['system'],
      exploredAt: new Date()
    });

    // Create UserMapTiles for two different colonies
    const userMapTile1 = await UserMapTile.create({
      serverTile: mapTile._id,
      colonyId: 'colony-1',
      exploredAt: new Date()
    });

    const userMapTile2 = await UserMapTile.create({
      serverTile: mapTile._id,
      colonyId: 'colony-2',
      exploredAt: new Date()
    });

    expect(userMapTile1.colonyId).toBe('colony-1');
    expect(userMapTile2.colonyId).toBe('colony-2');
    expect(userMapTile1.serverTile.toString()).toBe(mapTile._id.toString());
    expect(userMapTile2.serverTile.toString()).toBe(mapTile._id.toString());
  });
});