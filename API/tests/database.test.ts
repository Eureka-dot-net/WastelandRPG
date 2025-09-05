import mongoose from 'mongoose';
import { Colony } from '../src/models/Player/Colony';

describe('Database Connection', () => {
  it('should connect to MongoDB', async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      return;
    }
    
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    expect(mongoose.connection.db?.databaseName).toContain('test');
  });

  it('should be able to create and query documents', async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      return;
    }

    // Create a test colony
    const testColony = new Colony({
      userId: new mongoose.Types.ObjectId(),
      serverId: 'test-db',
      serverName: 'Test Database',
      colonyName: 'Database Test Colony',
      serverType: 'PvE',
      homesteadLocation: { x: 0, y: 0 },
      spiralLayer: 0,
      spiralPosition: 0,
      spiralDirection: 0,
      spiralIndex: 999999 // High number to avoid conflicts
    });

    await testColony.save();

    // Query it back
    const found = await Colony.findById(testColony._id);
    expect(found).toBeTruthy();
    expect(found!.colonyName).toBe('Database Test Colony');

    // Clean up
    await Colony.findByIdAndDelete(testColony._id);
  });
});