# WastelandRPG Database Setup Guide

This document explains the different ways to run WastelandRPG with a database backend.

## Quick Start (Recommended)

The fastest way to get started is using the automated setup script:

```bash
cd API
./setup.sh
npm run dev
```

This will automatically:
- Start MongoDB in a Docker container
- Create the proper `.env` configuration
- Install dependencies
- Provide instructions for next steps

## Database Options

### 1. Docker MongoDB (Recommended for Development)

**Pros:** Easy setup, isolated, consistent environment
**Cons:** Requires Docker

```bash
# Start MongoDB container
docker run -d -p 27017:27017 --name wasteland-mongodb mongo:latest

# Set environment variable
echo "MONGO_URI=mongodb://localhost:27017/wasteland_rpg" >> .env
```

**Management:**
```bash
# Stop MongoDB
docker stop wasteland-mongodb

# Start MongoDB  
docker start wasteland-mongodb

# Remove MongoDB (data will be lost)
docker rm wasteland-mongodb
```

### 2. Local MongoDB Installation

**Pros:** Full control, persistent across reboots
**Cons:** More complex setup, system-specific

**Installation:**
- **macOS:** `brew install mongodb-community`
- **Ubuntu:** Follow [MongoDB installation guide](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)
- **Windows:** Download from [MongoDB website](https://www.mongodb.com/try/download/community)

**Configuration:**
```bash
# Start MongoDB (varies by system)
mongod --dbpath /data/db

# Set environment variable
echo "MONGO_URI=mongodb://localhost:27017/wasteland_rpg" >> .env
```

### 3. MongoDB Atlas (Cloud Database)

**Pros:** No local setup, free tier available, automatic backups
**Cons:** Requires internet connection, some latency

**Setup:**
1. Sign up at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (choose free tier)
3. Create a database user
4. Get the connection string
5. Set environment variable:

```bash
echo "MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/wasteland_rpg" >> .env
```

### 4. In-Memory Database (Automatic Fallback)

**Pros:** No setup required, automatic
**Cons:** Requires internet access, data is lost when server restarts

This is automatically used when no `MONGO_URI` is provided:

```bash
# Just don't set MONGO_URI in .env
JWT_SECRET=your_secret_key
PORT=3000
NODE_ENV=development
# No MONGO_URI = automatic in-memory database
```

**Note:** This requires internet access to download MongoDB binaries. In environments without internet access, this will fail with helpful error messages.

## Testing Configuration

For tests, the system uses the same fallback logic:

1. If `MONGO_URI` is set in `.env.test`, uses external database
2. Otherwise, attempts in-memory database
3. Falls back to `mongodb://localhost:27017/wasteland_rpg_test`

**Recommended test setup:**
```bash
# .env.test
NODE_ENV=test
JWT_SECRET=test_secret_key
MONGO_URI=mongodb://localhost:27017/wasteland_rpg  # Uses same Docker instance
```

## Troubleshooting

### "Connection failed" errors
- Check if MongoDB is running: `docker ps` (for Docker) or `ps aux | grep mongod` (for local)
- Verify connection string in `.env` file
- Check if port 27017 is accessible

### "Download failed" errors  
- This happens when trying to use in-memory database without internet access
- Use Docker or local MongoDB instead

### Port conflicts
- MongoDB default port 27017 might be in use
- Use different port: `docker run -d -p 27018:27017 --name mongodb mongo:latest`
- Update connection string: `mongodb://localhost:27018/wasteland_rpg`

### Test database issues
- Tests use separate database names ending in `_test`
- Test databases are automatically cleaned up
- If tests fail, check that MongoDB is running and accessible

## Environment Files

The project includes example environment files:

- **`.env.example`** - Template for development environment
- **`.env.test.example`** - Template for test environment

Copy these files to create your configuration:

```bash
cp .env.example .env
cp .env.test.example .env.test
# Edit the files to set your specific configuration
```

## Security Notes

- Change `JWT_SECRET` in production
- Don't commit `.env` files to version control
- Use environment variables or secret management in production
- For Atlas, restrict IP access and use strong passwords