# Feedback Aggregator API Documentation

## Base URL
- Local: `http://localhost:8787`
- Production: `https://feedback-aggregator.YOUR-SUBDOMAIN.workers.dev`

## Endpoints

### 1. Submit Feedback
Submit new feedback for AI analysis and storage.

**Endpoint:** `POST /api/feedback`

**Request Body:**
```json
{
  "text": "The app is great but needs dark mode!",
  "source": "email"  // optional: email, survey, chat, support, etc.
}
```

**Response:**
```json
{
  "success": true,
  "id": 1,
  "sentiment": "positive",
  "sentiment_score": 0.87,
  "category": "feature"
}
```

**Example (curl):**
```bash
curl -X POST http://localhost:8787/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"text": "The app is amazing!", "source": "email"}'
```

---

### 2. Get Feedback
Retrieve all feedback with optional filters.

**Endpoint:** `GET /api/feedback`

**Query Parameters:**
- `sentiment` - Filter by sentiment (positive, negative, neutral)
- `category` - Filter by category (bug, feature, ui, performance, support, pricing, general)
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "text": "The app is great!",
      "sentiment": "positive",
      "sentiment_score": 0.92,
      "category": "general",
      "source": "email",
      "created_at": 1707336000
    }
  ],
  "count": 1
}
```

**Examples:**
```bash
# Get all feedback
curl http://localhost:8787/api/feedback

# Get only positive feedback
curl http://localhost:8787/api/feedback?sentiment=positive

# Get bug reports
curl http://localhost:8787/api/feedback?category=bug

# Get negative feedback, limited to 10 results
curl http://localhost:8787/api/feedback?sentiment=negative&limit=10
```

---

### 3. Get Statistics
Retrieve aggregated statistics and analytics.

**Endpoint:** `GET /api/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 15,
    "sentiment": [
      {
        "sentiment": "positive",
        "count": 8,
        "avg_score": 0.89
      },
      {
        "sentiment": "negative",
        "count": 5,
        "avg_score": 0.82
      },
      {
        "sentiment": "neutral",
        "count": 2,
        "avg_score": 0.65
      }
    ],
    "categories": [
      { "category": "feature", "count": 5 },
      { "category": "bug", "count": 4 },
      { "category": "ui", "count": 3 },
      { "category": "performance", "count": 2 },
      { "category": "general", "count": 1 }
    ],
    "trend": [
      { "date": "2026-02-01", "count": 3 },
      { "date": "2026-02-02", "count": 5 },
      { "date": "2026-02-03", "count": 7 }
    ]
  }
}
```

**Example:**
```bash
curl http://localhost:8787/api/stats
```

---

### 4. Generate Mock Data
Generate sample feedback for testing and demo purposes.

**Endpoint:** `POST /api/mock-data`

**Response:**
```json
{
  "success": true,
  "message": "Successfully generated 15 mock feedback entries"
}
```

**Example:**
```bash
curl -X POST http://localhost:8787/api/mock-data
```

---

## AI Processing

### Sentiment Analysis
Uses **Workers AI** model: `@cf/huggingface/distilbert-sst-2-int8`

Returns one of:
- `positive` - Positive sentiment detected
- `negative` - Negative sentiment detected
- `neutral` - Neutral or uncertain sentiment

Each result includes a confidence score (0-1).

### Categorization
Keyword-based classification into:
- **bug** - Bug reports, crashes, errors
- **feature** - Feature requests, suggestions
- **performance** - Speed, lag, optimization issues
- **ui** - Design, navigation, interface feedback
- **support** - Customer service feedback
- **pricing** - Cost-related feedback
- **general** - Everything else

---

## Testing the API

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Generate mock data:**
   ```bash
   curl -X POST http://localhost:8787/api/mock-data
   ```

3. **View statistics:**
   ```bash
   curl http://localhost:8787/api/stats
   ```

4. **View all feedback:**
   ```bash
   curl http://localhost:8787/api/feedback
   ```

5. **Submit new feedback:**
   ```bash
   curl -X POST http://localhost:8787/api/feedback \
     -H "Content-Type: application/json" \
     -d '{"text": "I love this tool!", "source": "demo"}'
   ```

---

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `201` - Created (for POST endpoints)
- `400` - Bad request (validation error)
- `500` - Internal server error

Error response format:
```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```
