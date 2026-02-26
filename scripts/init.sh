#!/bin/bash

# Move to the project root
cd "$(dirname "$0")/.."

echo "🚀 Initializing UNS-BMS-Lite Environment..."

# 1. Create the local .env if it doesn't exist
if [ ! -f docker/.env ]; then
    echo "Creating docker/.env from example..."
    cp docker/.env.example docker/.env
    echo "⚠️  Action Required: Update docker/.env with your secrets before running docker-compose."
else
    echo "✅ docker/.env already exists."
fi

# 2. Set permissions for the script
chmod +x scripts/*.sh

echo "✨ Initialization complete."