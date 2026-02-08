# Quick Start Guide

Get your feedback aggregator running in 5 minutes!

## Prerequisites

✅ Node.js 18+ installed
✅ npm installed
✅ Cloudflare account (free tier works)

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create D1 Database
```bash
npx wrangler d1 create feedback-db
```

You'll see output like:
```
✅ Successfully created DB 'feedback-db'

[[d1_databases]]
binding = "DB"
database_name = "feedback-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 3. Update Configuration
Copy the `database_id` from step 2 and update `wrangler.jsonc` line 28:

**Before:**
```json
"database_id": "YOUR_DATABASE_ID"
```

**After:**
```json
"database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 4. Initialize Database
```bash
# Local database (for development)
npx wrangler d1 execute feedback-db --local --file=./schema.sql

# Remote database (for production)
npx wrangler d1 execute feedback-db --remote --file=./schema.sql
```

### 5. Generate TypeScript Types
```bash
npm run cf-typegen
```

### 6. Start Development Server
```bash
npm run dev
```

You should see:
```
⎔ Starting local server...
[wrangler] Ready on http://localhost:8787
```

### 7. Open Dashboard
Open your browser to: **http://localhost:8787**

### 8. Generate Mock Data
Click the **"Generate Mock Data"** button in the dashboard, or use curl:

```bash
curl -X POST http://localhost:8787/api/mock-data
```

### 9. Explore!
- View feedback statistics and charts
- Filter by sentiment or category
- Submit new feedback
- See real-time AI analysis

## Verify Everything Works

Run the automated test script:
```bash
./test-api.sh
```

This will:
1. ✅ Generate mock data
2. ✅ Fetch statistics
3. ✅ Get all feedback
4. ✅ Filter feedback
5. ✅ Submit new feedback
6. ✅ Test AI analysis

## Common Issues

### "database not found"
- Make sure you ran the database creation command
- Verify the database_id is correct in wrangler.jsonc
- Run the schema initialization command

### "AI binding not found"
- Workers AI is automatically available
- No additional setup needed
- Make sure you're using a recent version of Wrangler

### Dashboard shows "No feedback"
- Click "Generate Mock Data" button
- Or submit feedback manually
- Check API: `curl http://localhost:8787/api/feedback`

### Port 8787 already in use
- Stop other Wrangler processes
- Or specify different port: `wrangler dev --port 8788`

## What's Next?

### Development
- Start building your own features
- Modify the dashboard design
- Add new API endpoints
- Integrate with external services

### Production Deployment
```bash
npm run deploy
```

Your app will be live at:
```
https://feedback-aggregator.YOUR-SUBDOMAIN.workers.dev
```

### Testing
- Use the test script: `./test-api.sh`
- Try different feedback inputs
- Test filtering and searching
- Verify AI analysis accuracy

## File Overview

| File | Purpose |
|------|---------|
| `src/index.ts` | Worker API implementation |
| `public/index.html` | Dashboard HTML |
| `public/styles.css` | Dashboard styling |
| `public/app.js` | Dashboard JavaScript |
| `schema.sql` | Database schema |
| `wrangler.jsonc` | Cloudflare configuration |
| `API.md` | API documentation |
| `DASHBOARD.md` | Dashboard guide |
| `test-api.sh` | Automated tests |

## API Quick Reference

### Submit Feedback
```bash
curl -X POST http://localhost:8787/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"text": "Great product!", "source": "email"}'
```

### Get All Feedback
```bash
curl http://localhost:8787/api/feedback
```

### Get Statistics
```bash
curl http://localhost:8787/api/stats
```

### Filter by Sentiment
```bash
curl http://localhost:8787/api/feedback?sentiment=positive
```

### Filter by Category
```bash
curl http://localhost:8787/api/feedback?category=bug
```

## Resources

- 📖 [Full Setup Guide](./SETUP.md)
- 🔌 [API Documentation](./API.md)
- 🎨 [Dashboard Guide](./DASHBOARD.md)
- 📚 [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- 🤖 [Workers AI Docs](https://developers.cloudflare.com/workers-ai/)

## Need Help?

1. Check the troubleshooting sections in:
   - [SETUP.md](./SETUP.md)
   - [DASHBOARD.md](./DASHBOARD.md)

2. Review the example test script:
   - [test-api.sh](./test-api.sh)

3. Verify your configuration:
   - [wrangler.jsonc](./wrangler.jsonc)

## Summary

You now have:
- ✅ A working Cloudflare Worker API
- ✅ AI-powered sentiment analysis
- ✅ D1 database with feedback storage
- ✅ Beautiful interactive dashboard
- ✅ Mock data for testing
- ✅ Complete documentation

**Happy building! 🚀**
