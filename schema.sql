-- D1 Database Schema for Feedback Aggregator

DROP TABLE IF EXISTS feedback;

CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  sentiment TEXT NOT NULL, -- 'positive', 'negative', 'neutral'
  sentiment_score REAL, -- confidence score from AI model
  category TEXT, -- auto-categorized by AI (e.g., 'bug', 'feature', 'ui', 'performance')
  source TEXT, -- where feedback came from (e.g., 'email', 'survey', 'chat')
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Index for faster queries by sentiment
CREATE INDEX idx_sentiment ON feedback(sentiment);

-- Index for faster queries by category
CREATE INDEX idx_category ON feedback(category);

-- Index for faster queries by date
CREATE INDEX idx_created_at ON feedback(created_at);
