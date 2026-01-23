# Turso Database Migration Guide

This guide shows you how to manually create the database tables in Turso.

## Option 1: Using Turso CLI

### Prerequisites
1. Install Turso CLI:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. Login to Turso:
   ```bash
   turso auth login
   ```

### Create Tables

1. Connect to your database:
   ```bash
   turso db shell your-database-name
   ```

2. Run the SQL commands from `migrations/turso_schema.sql`:
   ```sql
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
   ```

3. Exit the shell:
   ```bash
   .exit
   ```

## Option 2: Using Turso Dashboard

1. Go to [Turso Dashboard](https://turso.tech/dashboard)
2. Select your database
3. Click on the "Query" tab
4. Copy and paste the SQL from `migrations/turso_schema.sql`
5. Click "Run Query"

## Option 3: Using SQL File

If you have the SQL file, you can pipe it to Turso:

```bash
cat migrations/turso_schema.sql | turso db shell your-database-name
```

## Verify Tables Created

Run this query to verify the table exists:

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name='webhook_logs';
```

## Verify Indexes Created

Run this query to verify all indexes exist:

```sql
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_webhook_logs%';
```

You should see:
- `idx_webhook_logs_timestamp`
- `idx_webhook_logs_method`
- `idx_webhook_logs_status_code`
- `idx_webhook_logs_path`
- `idx_webhook_logs_webhook_id`

## Automatic Schema Creation

**Note:** The application automatically creates the schema on first use if it doesn't exist. However, if you prefer to create it manually (for production environments), use the methods above.

## Table Schema Details

### webhook_logs

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key, unique log identifier |
| `timestamp` | TEXT | ISO timestamp when request was received |
| `method` | TEXT | HTTP method (GET, POST, etc.) |
| `path` | TEXT | Request path |
| `url` | TEXT | Full request URL |
| `status_code` | INTEGER | HTTP status code returned |
| `timeout` | INTEGER | Timeout duration in seconds (optional) |
| `start_time` | TEXT | Start time for timeout (optional) |
| `end_time` | TEXT | End time for timeout (optional) |
| `headers` | TEXT | JSON string of request headers |
| `query_params` | TEXT | JSON string of query parameters |
| `body` | TEXT | JSON string of request body (optional) |
| `webhook_id` | TEXT | Webhook ID for session-based webhooks (optional) |
| `created_at` | TEXT | Database insertion timestamp |

### Indexes

- **idx_webhook_logs_timestamp**: For sorting logs by time (DESC)
- **idx_webhook_logs_method**: For filtering by HTTP method
- **idx_webhook_logs_status_code**: For filtering by status code
- **idx_webhook_logs_path**: For filtering by path
- **idx_webhook_logs_webhook_id**: For filtering by webhook ID (session-based)

## Troubleshooting

### Table Already Exists
If you see "table already exists" errors, that's fine - the `IF NOT EXISTS` clause prevents errors. The schema is idempotent and safe to run multiple times.

### Missing Columns
If you're upgrading from an older schema, you may need to add the `webhook_id` column:

```sql
ALTER TABLE webhook_logs ADD COLUMN webhook_id TEXT;
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
```

### Performance
The indexes are optimized for common query patterns:
- Recent logs (timestamp DESC)
- Filtering by webhook ID
- Analytics queries (method, status_code, path)

## Next Steps

After creating the tables:
1. Verify your environment variables are set:
   ```env
   STORAGE_TYPE=turso
   TURSO_DATABASE_URL=libsql://...
   TURSO_AUTH_TOKEN=...
   ```

2. Start your application:
   ```bash
   npm run dev
   ```

3. The application will use the existing tables automatically.
