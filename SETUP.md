# Feedback Aggregator Setup Guide

This guide walks you through setting up all Cloudflare products needed for the feedback aggregation tool.

## Cloudflare Products Used

1. **Cloudflare Workers** - Main application runtime
2. **Workers AI** - Sentiment analysis and categorization
3. **D1 Database** - Persistent storage for feedback
4. **Static Assets** - Dashboard hosting

## Setup Steps

### 1. Create D1 Database

First, create a new D1 database:

```bash
npx wrangler d1 create feedback-db
```

This will output something like:
```
✅ Successfully created DB 'feedback-db'!

[[d1_databases]]
binding = "DB"
database_name = "feedback-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Copy the `database_id`** and update it in `wrangler.jsonc` (replace `YOUR_DATABASE_ID`).

### 2. Initialize Database Schema

Run the schema migration to create the feedback table:

```bash
npx wrangler d1 execute feedback-db --local --file=./schema.sql
npx wrangler d1 execute feedback-db --remote --file=./schema.sql
```

The `--local` flag sets up your local development database.
The `--remote` flag sets up your production database.

### 3. Generate TypeScript Types

After updating the bindings in `wrangler.jsonc`, generate types:

```bash
npm run cf-typegen
```

This creates type definitions for the `Env` object with your bindings (AI, DB, ASSETS).

### 4. Test Locally

Start the development server:

```bash
npm run dev
```

Visit http://localhost:8787 to test your Worker.

### 5. Deploy to Cloudflare

When ready to deploy:

```bash
npm run deploy
```

## Bindings Overview

Your Worker will have access to these bindings via the `env` parameter:

- **`env.AI`** - Workers AI binding for ML inference
- **`env.DB`** - D1 database binding for SQL queries
- **`env.ASSETS`** - Static assets for serving the dashboard

## Workers AI Models

For this project, you can use:

- **Sentiment Analysis**: `@cf/huggingface/distilbert-sst-2-int8`
- **Text Classification**: `@cf/huggingface/distilbert-sst-2-int8` or custom prompts
- **Alternative**: `@cf/meta/llama-3.1-8b-instruct` for more flexible categorization

## Database Schema

The `feedback` table includes:
- `id` - Auto-incrementing primary key
- `text` - Feedback content
- `sentiment` - positive/negative/neutral
- `sentiment_score` - AI confidence score
- `category` - Auto-categorized (bug/feature/ui/performance/etc)
- `source` - Where feedback originated
- `created_at` - Unix timestamp

## Next Steps

1. Create the D1 database and update wrangler.jsonc
2. Run the schema migration
3. Build the API endpoints in src/index.ts
4. Create the dashboard in public/index.html
5. Add mock data generation for testing
