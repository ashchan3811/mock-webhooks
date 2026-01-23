-- Turso Database Schema for Mock Webhook API
-- Run this SQL in your Turso database to create the required tables and indexes

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  url TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  timeout INTEGER,
  start_time TEXT,
  end_time TEXT,
  headers TEXT NOT NULL,
  query_params TEXT NOT NULL,
  body TEXT,
  webhook_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_timestamp 
ON webhook_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_method 
ON webhook_logs(method);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_status_code 
ON webhook_logs(status_code);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_path 
ON webhook_logs(path);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id 
ON webhook_logs(webhook_id);

-- Verify table creation
-- SELECT name FROM sqlite_master WHERE type='table' AND name='webhook_logs';

-- Verify indexes
-- SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_webhook_logs%';
