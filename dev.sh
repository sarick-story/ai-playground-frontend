#!/bin/bash

# Start the Python API server in the background
echo "Starting Python API server..."
cd "$(dirname "$0")"
source .venv/bin/activate
python -m api.index &
API_PID=$!

# Start the Next.js frontend
echo "Starting Next.js frontend..."
npm run dev

# When the Next.js process is terminated, also kill the API server
kill $API_PID 