#!/bin/bash

echo "🏦 Starting Mortgage Calculator..."
echo "Building application..."
npm run build

echo ""
echo "Starting preview server..."
npm run preview &
SERVER_PID=$!

# Wait for server to start
sleep 2

echo ""
echo "Opening browser..."
open http://localhost:4173/

echo ""
echo "✅ Mortgage Calculator is running at http://localhost:4173/"
echo "Press Ctrl+C to stop the server"

# Wait for user to stop
wait $SERVER_PID