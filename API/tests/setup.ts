import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  } catch (error) {
    console.error('Failed to setup MongoDB Memory Server:', error);
    // Fallback to test database if memory server fails
    const testConnectionString = 'mongodb://localhost:27017/wasteland-test';
    try {
      await mongoose.connect(testConnectionString);
      console.log('Connected to local MongoDB for testing');
    } catch (localError) {
      console.error('Failed to connect to local MongoDB:', localError);
      throw new Error('Unable to connect to any MongoDB instance for testing');
    }
  }
}, 15000); // Increase timeout for setup

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase(); // optional: clean up after all tests
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
}, 10000); // Increase timeout for cleanup