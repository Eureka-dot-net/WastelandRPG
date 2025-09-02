import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;

beforeAll(async () => {
  // Check if we should use external MongoDB (like Docker) for testing
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI.replace(/\/[^/]*$/, '/wasteland_rpg_test'));
      console.log('✅ Connected to external MongoDB for testing');
      return;
    } catch (error) {
      console.error('Failed to connect to external MongoDB:', error);
    }
  }

  // Fallback to Memory Server
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('✅ Connected to in-memory MongoDB for testing');
  } catch (error) {
    console.error('Failed to setup MongoDB Memory Server:', error);
    
    // Final fallback to localhost
    const testConnectionString = 'mongodb://localhost:27017/wasteland_rpg_test';
    try {
      await mongoose.connect(testConnectionString);
      console.log('✅ Connected to local MongoDB for testing');
    } catch (localError) {
      console.error('Failed to connect to local MongoDB:', localError);
      throw new Error('Unable to connect to any MongoDB instance for testing');
    }
  }
}, 30000); // Increase timeout for setup

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      // Only drop database if it's a test database
      const dbName = mongoose.connection.db?.databaseName;
      if (dbName && dbName.includes('test')) {
        await mongoose.connection.dropDatabase();
      }
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
}, 15000); // Increase timeout for cleanup