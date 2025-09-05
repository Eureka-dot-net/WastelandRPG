import mongoose from 'mongoose';

let isConnected = false;
let connectionAttempted = false;

beforeAll(async () => {
  // Only attempt connection once
  if (connectionAttempted) return;
  connectionAttempted = true;

  // Check if we should use external MongoDB (like Docker) for testing
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI.replace(/\/[^/]*$/, '/wasteland_rpg_test'));
      isConnected = true;
      return;
    } catch (error) {
      // Silent fail for external MongoDB
    }
  }

  // Final fallback to localhost - this will work if a local MongoDB is available
  const testConnectionString = 'mongodb://localhost:27017/wasteland_rpg_test';
  try {
    await mongoose.connect(testConnectionString, {
      serverSelectionTimeoutMS: 1000, // Quick timeout
      connectTimeoutMS: 1000
    });
    isConnected = true;
  } catch (localError) {
    // Silent fail - tests will be skipped
    isConnected = false;
  }
}, 5000); // Reduced timeout

afterAll(async () => {
  if (!isConnected) return;
  
  try {
    if (mongoose.connection.readyState !== 0) {
      // Only drop database if it's a test database
      const dbName = mongoose.connection.db?.databaseName;
      if (dbName && dbName.includes('test')) {
        await mongoose.connection.dropDatabase();
      }
      await mongoose.connection.close();
    }
  } catch (error) {
    // Silent cleanup error
  }
  isConnected = false;
}, 5000);

// Helper function to check if tests should be skipped
(global as any).skipIfNoMongoDB = () => {
  return !isConnected;
};