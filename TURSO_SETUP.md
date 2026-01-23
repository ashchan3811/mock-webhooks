# Turso Storage Setup Guide

This guide will help you set up Turso (libSQL) as the storage backend for the Mock Webhook API.

## What is Turso?

Turso is a serverless, edge-ready SQLite-compatible database built on libSQL. It provides:
- **Global distribution** - Low latency worldwide
- **Serverless** - No infrastructure to manage
- **SQLite-compatible** - Familiar SQL syntax
- **Free tier** - Generous free tier for development

## Prerequisites

1. A Turso account (sign up at [turso.tech](https://turso.tech))
2. Turso CLI installed (optional, for local development)

## Step 1: Install Dependencies

The Turso client library is already included in `package.json`. Install it:

```bash
npm install
```

## Step 2: Create a Turso Database

### Option A: Using Turso Dashboard

1. Go to [Turso Dashboard](https://turso.tech/dashboard)
2. Sign in or create an account
3. Click "Create Database"
4. Choose a name and location
5. Copy the database URL and auth token

### Option B: Using Turso CLI

```bash
# Install Turso CLI (if not already installed)
curl -sSfL https://get.tur.so/install.sh | bash

# Login to Turso
turso auth login

# Create a database
turso db create mock-webhooks

# Create a database token
turso db tokens create mock-webhooks

# Get database URL
turso db show mock-webhooks --url
```

## Step 3: Configure Environment Variables

Add the following to your `.env` file or environment:

```env
# Storage Configuration
STORAGE_TYPE=turso

# Turso Configuration
TURSO_DATABASE_URL=libsql://your-database-url.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here

# Optional: Limit number of logs (0 = unlimited)
MAX_LOGS=10000
```

### Getting Your Credentials

**Database URL:**
- Format: `libsql://your-database-name-org.turso.io`
- Found in Turso Dashboard → Your Database → Connect

**Auth Token:**
- Found in Turso Dashboard → Your Database → Tokens
- Or generate with: `turso db tokens create your-database-name`

## Step 4: Database Schema

The schema is automatically created on first use. The following table and indexes are created:

```sql
CREATE TABLE webhook_logs (
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
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX idx_webhook_logs_timestamp ON webhook_logs(timestamp DESC);
CREATE INDEX idx_webhook_logs_method ON webhook_logs(method);
CREATE INDEX idx_webhook_logs_status_code ON webhook_logs(status_code);
CREATE INDEX idx_webhook_logs_path ON webhook_logs(path);
```

## Step 5: Verify Setup

1. Start your application:
   ```bash
   npm run dev
   ```

2. Send a test webhook:
   ```bash
   curl -X POST http://localhost:3000/webhooks/test \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

3. Check the logs dashboard - you should see the log stored in Turso

4. Verify in Turso Dashboard:
   - Go to your database
   - Click "Query" tab
   - Run: `SELECT COUNT(*) FROM webhook_logs;`

## Local Development with Turso

For local development, you can use Turso's local replica:

```bash
# Create a local replica
turso db replicate mock-webhooks --local

# This creates a local SQLite file you can use for development
# Update your .env:
TURSO_DATABASE_URL=file:./local.db
TURSO_AUTH_TOKEN=  # Not needed for local file
```

## Production Deployment

### Vercel

1. Add environment variables in Vercel Dashboard:
   - `STORAGE_TYPE=turso`
   - `TURSO_DATABASE_URL=libsql://...`
   - `TURSO_AUTH_TOKEN=...`

2. Deploy:
   ```bash
   vercel deploy
   ```

### Other Platforms

Ensure your environment variables are set:
- `STORAGE_TYPE=turso`
- `TURSO_DATABASE_URL` - Your Turso database URL
- `TURSO_AUTH_TOKEN` - Your Turso auth token

## Switching Between Storage Types

You can easily switch between storage types:

```env
# Use in-memory storage (default)
STORAGE_TYPE=memory

# Use Turso
STORAGE_TYPE=turso
```

The application will automatically use the configured storage type.

## Performance Considerations

### Indexes
The implementation includes indexes on:
- `timestamp` (DESC) - For sorting and pagination
- `method` - For method-based queries
- `status_code` - For status-based analytics
- `path` - For path-based analytics

### Log Retention
Set `MAX_LOGS` to limit the number of logs stored:
```env
MAX_LOGS=10000  # Keep only the 10,000 most recent logs
```

When the limit is reached, older logs are automatically deleted.

## Troubleshooting

### Error: "Turso configuration missing"
- Ensure `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set
- Check that environment variables are loaded correctly

### Error: "Failed to connect to database"
- Verify your database URL is correct
- Check that your auth token is valid
- Ensure your IP is allowed (if using IP allowlist)

### Slow queries
- Check that indexes are created (they're auto-created on first use)
- Consider increasing `MAX_LOGS` limit or implementing log rotation
- Use Turso's location closest to your application

### Schema errors
- The schema is auto-created on first use
- If you see schema errors, check Turso Dashboard → Query tab
- You can manually run the schema SQL if needed

## Migration from Memory Storage

To migrate existing logs from memory to Turso:

1. Export logs (if you have an export feature):
   ```bash
   curl http://localhost:3000/api/logs > logs.json
   ```

2. Switch to Turso:
   ```env
   STORAGE_TYPE=turso
   ```

3. Import logs (you may need to create a migration script):
   ```typescript
   // Example migration script
   const logs = JSON.parse(fs.readFileSync('logs.json'));
   for (const log of logs) {
     await storage.addLog(log);
   }
   ```

## Best Practices

1. **Use environment variables** - Never commit credentials to git
2. **Rotate tokens** - Regularly rotate your auth tokens
3. **Monitor usage** - Check Turso Dashboard for usage metrics
4. **Set MAX_LOGS** - Prevent unbounded growth
5. **Use local replica** - For faster local development

## Turso Limits

Check Turso's current limits:
- **Free tier**: Usually includes generous limits
- **Database size**: Check your plan limits
- **Request rate**: Monitor in Turso Dashboard

## Additional Resources

- [Turso Documentation](https://docs.turso.tech)
- [Turso Dashboard](https://turso.tech/dashboard)
- [libSQL Documentation](https://libsql.org/docs)

## Support

If you encounter issues:
1. Check Turso Dashboard for database status
2. Verify environment variables are set correctly
3. Check application logs for detailed error messages
4. Review Turso documentation for API changes
