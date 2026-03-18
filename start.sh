#!/bin/bash
echo "Starting VendedorIA 2026..."

# Backend
cd backend
python3 -m venv venv 2>/dev/null
source venv/bin/activate
pip install -r requirements.txt -q
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Frontend
cd frontend
npm install -q
npx ng serve --port 4200 &
FRONTEND_PID=$!
cd ..

echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:4200"
echo "Press Ctrl+C to stop"
wait
