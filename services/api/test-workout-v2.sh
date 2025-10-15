#!/bin/bash

echo "Testing GymBro Workout Generation V2..."
echo "==========================================="
echo ""

curl -X POST http://localhost:3001/ai/workout \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_v2",
    "gender": "male",
    "age": 28,
    "weight": 92,
    "targetWeight": 78,
    "heightCm": 178,
    "activityLevel": "intermediate",
    "experienceLevel": "מתחיל",
    "goal": "שריפת שומן",
    "workoutsPerWeek": 5
  }' \
  --max-time 45 \
  -w "\n\nResponse Time: %{time_total}s\nHTTP Status: %{http_code}\n"

echo ""
echo "==========================================="
