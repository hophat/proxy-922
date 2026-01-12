#!/bin/sh

set -e

echo "🚀 Starting backend..."

# Check if node_modules exists and has required packages
if [ ! -d "/app/node_modules" ] || [ ! -f "/app/node_modules/@nestjs/config/package.json" ] || [ ! -f "/app/node_modules/nodemailer/package.json" ]; then
  echo "📦 Installing dependencies..."
  npm install --include=dev
  echo "✅ Dependencies installed"
fi

# Check if we're in production mode
if [ "$NODE_ENV" = "production" ]; then
  echo "📦 Production mode detected"
  
  # Check if dist folder exists and has main.js
  if [ ! -f /app/dist/main.js ]; then
    echo "🔨 Building application..."
    npm run build
    echo "✅ Build completed"
  else
    echo "✅ Build already exists"
  fi
  
  echo "▶️  Starting production server..."
  exec npm run start:prod
else
  echo "🔧 Development mode detected"
  echo "▶️  Starting development server with watch mode..."
  exec npm run start:dev
fi

