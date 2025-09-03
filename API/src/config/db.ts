import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;
let isUsingMockDatabase = false;

export const connectDB = async (): Promise<void> => {
  try {
    // Check if MONGO_URI is provided
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ MongoDB connected to external database');
      console.log('📍 Database URI:', process.env.MONGO_URI);
      return;
    }

    // Fallback to MongoDB Memory Server for development
    console.log('No MONGO_URI found, attempting to start in-memory MongoDB...');
    
    try {
      // Configure MongoDB Memory Server 
      mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'wasteland_rpg_dev',
          port: 0, // Let the system choose a free port
        },
      });
      
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log('✅ In-memory MongoDB started successfully');
      console.log('📍 Database URI:', uri);
      console.log('💡 This is a temporary database that will be reset when the server restarts');
      
    } catch (memoryServerError) {
      const error = memoryServerError as Error;
      console.log('⚠️  MongoDB Memory Server failed to start:', error.message);
      
      // Try to provide a graceful fallback by creating a minimal mock setup
      console.log('🔄 Setting up development environment with guidance...');
      console.log('\n📋 To properly run this application, you need a MongoDB database.');
      console.log('Please choose one of these options:\n');
      console.log('1. 🏠 LOCAL MONGODB (Recommended for development):');
      console.log('   - Install MongoDB: https://docs.mongodb.com/manual/installation/');
      console.log('   - Start MongoDB: mongod --dbpath /data/db');
      console.log('   - Set MONGO_URI=mongodb://localhost:27017/wasteland_rpg in .env\n');
      console.log('2. ☁️  MONGODB ATLAS (Free cloud option):');
      console.log('   - Sign up at: https://www.mongodb.com/atlas');
      console.log('   - Create a cluster and get connection string');
      console.log('   - Set MONGO_URI in .env with your Atlas connection string\n');
      console.log('3. 🐳 DOCKER MONGODB:');
      console.log('   - Run: docker run -d -p 27017:27017 --name mongodb mongo:latest');
      console.log('   - Set MONGO_URI=mongodb://localhost:27017/wasteland_rpg in .env\n');
      console.log('4. 🔧 ENABLE INTERNET ACCESS for automatic in-memory database\n');
      
      console.log('📝 For quick setup, copy the .env.example file to .env and update MONGO_URI:');
      console.log('   cp .env.example .env');
      console.log('   # Then edit .env to set your MONGO_URI\n');
      
      throw new Error('No database connection available. Please configure MONGO_URI in .env or ensure internet access for in-memory database.');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', (error as Error).message);
    if (!isUsingMockDatabase) {
      console.log('\n🚨 The server cannot start without a database connection.');
      console.log('Please follow the setup instructions above.\n');
      process.exit(1);
    }
  }
};

export const closeDB = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
      mongoServer = null;
    }
  } catch (error) {
    console.error('Error closing database:', error);
  }
};

export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};