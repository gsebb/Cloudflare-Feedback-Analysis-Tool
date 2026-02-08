#!/bin/bash

# Feedback Aggregator API Test Script
# Make sure the dev server is running: npm run dev

BASE_URL="http://localhost:8787"
echo "Testing Feedback Aggregator API at $BASE_URL"
echo "============================================"
echo ""

# Test 1: Generate mock data
echo "📝 Test 1: Generating mock data..."
curl -s -X POST "$BASE_URL/api/mock-data" | jq '.'
echo ""
echo ""

# Wait a bit for data to be inserted
sleep 2

# Test 2: Get statistics
echo "📊 Test 2: Getting statistics..."
curl -s "$BASE_URL/api/stats" | jq '.'
echo ""
echo ""

# Test 3: Get all feedback
echo "📋 Test 3: Getting all feedback..."
curl -s "$BASE_URL/api/feedback?limit=5" | jq '.'
echo ""
echo ""

# Test 4: Get positive feedback only
echo "😊 Test 4: Getting positive feedback..."
curl -s "$BASE_URL/api/feedback?sentiment=positive&limit=3" | jq '.'
echo ""
echo ""

# Test 5: Get bug reports
echo "🐛 Test 5: Getting bug reports..."
curl -s "$BASE_URL/api/feedback?category=bug" | jq '.'
echo ""
echo ""

# Test 6: Submit new feedback
echo "✍️  Test 6: Submitting new feedback..."
curl -s -X POST "$BASE_URL/api/feedback" \
  -H "Content-Type: application/json" \
  -d '{"text": "This feedback aggregator is awesome!", "source": "test"}' | jq '.'
echo ""
echo ""

# Test 7: Submit negative feedback
echo "😞 Test 7: Submitting negative feedback..."
curl -s -X POST "$BASE_URL/api/feedback" \
  -H "Content-Type: application/json" \
  -d '{"text": "The app crashes when I click the export button. Very frustrating!", "source": "test"}' | jq '.'
echo ""
echo ""

echo "✅ All tests completed!"
echo ""
echo "Next steps:"
echo "1. Visit http://localhost:8787 to see the dashboard"
echo "2. Check the stats: curl http://localhost:8787/api/stats | jq"
echo "3. View all feedback: curl http://localhost:8787/api/feedback | jq"
