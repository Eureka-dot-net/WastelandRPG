#!/bin/bash

# WastelandRPG API Setup Script
# This script helps you set up the development environment quickly

echo "🎮 WastelandRPG API Setup"
echo "========================="
echo

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
port_in_use() {
    lsof -i:$1 >/dev/null 2>&1
}

# Check for Docker
if command_exists docker; then
    echo "✅ Docker found"
    
    # Check if MongoDB container is already running
    if docker ps --format "table {{.Names}}" | grep -q "wasteland-mongodb\|mongodb"; then
        echo "✅ MongoDB container already running"
    else
        echo "🚀 Starting MongoDB container..."
        if docker run -d -p 27017:27017 --name wasteland-mongodb mongo:latest; then
            echo "✅ MongoDB container started successfully"
            sleep 3  # Give MongoDB a moment to start
        else
            echo "❌ Failed to start MongoDB container"
            echo "   Try: docker rm wasteland-mongodb (if container exists)"
            exit 1
        fi
    fi
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        echo "📝 Creating .env file..."
        cat > .env << EOL
# WastelandRPG API Configuration
JWT_SECRET=dev_secret_key_change_this_in_production
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/wasteland_rpg
EOL
        echo "✅ .env file created with Docker MongoDB configuration"
    else
        echo "📄 .env file already exists"
    fi
    
else
    echo "⚠️  Docker not found. Please install Docker or set up MongoDB manually."
    echo
    echo "Alternative setup options:"
    echo "1. Install Docker: https://docs.docker.com/get-docker/"
    echo "2. Install MongoDB locally: https://docs.mongodb.com/manual/installation/"
    echo "3. Use MongoDB Atlas: https://www.mongodb.com/atlas"
    echo
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

echo
echo "🎉 Setup complete!"
echo
echo "To start the development server:"
echo "  npm run dev"
echo
echo "To run tests:"
echo "  npm test"
echo
echo "To stop MongoDB container:"
echo "  docker stop wasteland-mongodb"
echo
echo "API will be available at: http://localhost:3000"
echo "MongoDB connection: mongodb://localhost:27017/wasteland_rpg"