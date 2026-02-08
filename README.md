# Feedback Aggregator

A serverless feedback aggregation tool built with Cloudflare Workers, featuring AI-powered sentiment analysis and categorization.

## Features

- 🤖 **AI Sentiment Analysis** - Automatically detect positive/negative/neutral sentiment using Workers AI
- 🏷️ **Smart Categorization** - Auto-categorize feedback into bug reports, feature requests, UI issues, etc.
- 📊 **Analytics Dashboard** - Visualize feedback trends and statistics
- 💾 **Persistent Storage** - Store feedback in Cloudflare D1 SQL database
- ⚡ **Serverless & Fast** - Runs on Cloudflare's global edge network
- 🎯 **Mock Data** - Built-in mock data generation for testing

## Architecture

### Cloudflare Products Used

1. **Cloudflare Workers** - Serverless compute platform
2. **Workers AI** - Sentiment analysis using `@cf/huggingface/distilbert-sst-2-int8`
3. **D1 Database** - SQL database for feedback storage
4. **Static Assets** - Dashboard hosting

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (free tier works)
- Wrangler CLI

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create D1 database:**
   ```bash
   npx wrangler d1 create feedback-db
   ```

3. **Update `wrangler.jsonc`:**
   Copy the `database_id` from step 2 and replace `YOUR_DATABASE_ID` in `wrangler.jsonc`.

4. **Initialize database:**
   ```bash
   npx wrangler d1 execute feedback-db --local --file=./schema.sql
   npx wrangler d1 execute feedback-db --remote --file=./schema.sql
   ```

5. **Generate types:**
   ```bash
   npm run cf-typegen
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

7. **Test the API:**
   ```bash
   ./test-api.sh
   ```

## API Endpoints

### POST `/api/feedback`
Submit new feedback for AI analysis.

```bash
curl -X POST http://localhost:8787/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"text": "Great product!", "source": "email"}'
```

### GET `/api/feedback`
Retrieve feedback with optional filters.

```bash
# Get all feedback
curl http://localhost:8787/api/feedback

# Filter by sentiment
curl http://localhost:8787/api/feedback?sentiment=positive

# Filter by category
curl http://localhost:8787/api/feedback?category=bug
```

### GET `/api/stats`
Get aggregated statistics.

```bash
curl http://localhost:8787/api/stats
```

### POST `/api/mock-data`
Generate sample data for testing.

```bash
curl -X POST http://localhost:8787/api/mock-data
```

See [API.md](./API.md) for complete API documentation.

## Dashboard

The dashboard provides a modern, interactive interface for viewing and analyzing feedback:

### Features
- 📊 **Real-time Statistics** - Total feedback, sentiment breakdown with percentages
- 📈 **Interactive Charts** - Sentiment distribution (doughnut) and category breakdown (bar)
- 🔍 **Filtering** - Filter by sentiment and category
- ✍️ **Submit Feedback** - Built-in form with instant AI analysis
- 🎲 **Mock Data** - One-click sample data generation
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

### Access Dashboard
Visit http://localhost:8787 after starting the dev server.

See [DASHBOARD.md](./DASHBOARD.md) for complete dashboard documentation.

## Project Structure

```
feedback-aggregator/
├── src/
│   └── index.ts           # Main Worker API implementation
├── public/                # Dashboard static files
│   ├── index.html         # Dashboard HTML
│   ├── styles.css         # Dashboard styles
│   └── app.js             # Dashboard JavaScript
├── schema.sql             # D1 database schema
├── wrangler.jsonc         # Cloudflare configuration
├── test-api.sh           # API test script
├── API.md                # API documentation
├── DASHBOARD.md          # Dashboard guide
├── SETUP.md              # Detailed setup guide
└── package.json          # Dependencies
```

## Database Schema

```sql
feedback (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  sentiment TEXT NOT NULL,        -- positive/negative/neutral
  sentiment_score REAL,           -- AI confidence (0-1)
  category TEXT,                  -- bug/feature/ui/performance/support/pricing/general
  source TEXT,                    -- email/survey/chat/support/etc
  created_at INTEGER DEFAULT NOW
)
```

## Development

```bash
# Start dev server
npm run dev

# Run tests
npm test

# Generate TypeScript types
npm run cf-typegen

# Deploy to production
npm run deploy
```

## Deployment

```bash
# Deploy to Cloudflare
npm run deploy

# Your Worker will be available at:
# https://feedback-aggregator.YOUR-SUBDOMAIN.workers.dev
```

## How It Works

1. **Feedback Submission:**
   - User submits feedback via POST `/api/feedback`
   - Text is sent to Workers AI for sentiment analysis
   - Feedback is categorized using keyword matching
   - Results are stored in D1 database

2. **AI Processing:**
   - **Sentiment Analysis:** Uses DistilBERT model to classify as positive/negative/neutral
   - **Categorization:** Keyword-based classification into 7 categories
   - **Confidence Scores:** Each prediction includes a confidence score

3. **Data Retrieval:**
   - Query feedback with filters (sentiment, category, date)
   - Aggregate statistics for dashboards
   - Track trends over time

## Categories

- **bug** - Bug reports, crashes, errors
- **feature** - Feature requests and suggestions
- **performance** - Speed and optimization issues
- **ui** - Design and interface feedback
- **support** - Customer service feedback
- **pricing** - Cost-related feedback
- **general** - Uncategorized feedback

## Demo Data

Generate 15 sample feedback entries:

```bash
curl -X POST http://localhost:8787/api/mock-data
```

Sample feedback includes:
- Positive reviews and praise
- Bug reports and technical issues
- Feature requests
- UX/UI feedback
- Pricing concerns

## Testing

Run the included test script to verify all endpoints:

```bash
./test-api.sh
```

This will:
1. Generate mock data
2. Fetch statistics
3. Query feedback with filters
4. Submit new feedback
5. Test sentiment analysis

## Limitations

- Mock data generation for demo purposes (no real integrations)
- Keyword-based categorization (could be enhanced with more advanced AI models)
- Basic dashboard (requires implementation)
- No authentication (add auth for production use)

## Future Enhancements

- [ ] Advanced AI categorization using LLM
- [ ] Interactive dashboard with charts
- [ ] Real-time feedback notifications
- [ ] Export data to CSV/JSON
- [ ] Integration with external platforms (Slack, Email)
- [ ] User authentication and multi-tenancy
- [ ] Webhook support for feedback submission

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

## License

MIT
