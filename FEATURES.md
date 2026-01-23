# New Features Documentation

This document describes the new features added to the Mock Webhook API.

## 1. Persistent Storage (Optional Database)

### Overview
The application now supports a storage abstraction layer that allows switching between in-memory and database storage.

### Current Implementation
- **Default:** In-memory storage (fast, no setup required)
- **Turso:** SQLite-compatible serverless database (production-ready)
- **Future:** Additional database support (PostgreSQL, MongoDB, etc.)

### Configuration

```env
# Storage type: "memory" (default) or "turso"
STORAGE_TYPE=memory

# Maximum logs to store (applies to both memory and turso)
MAX_LOGS=1000

# Turso configuration (required if STORAGE_TYPE=turso)
TURSO_DATABASE_URL=libsql://your-database-url.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here
```

### Turso Setup

Turso is a serverless, edge-ready SQLite-compatible database. See [TURSO_SETUP.md](./TURSO_SETUP.md) for complete setup instructions.

**Quick Start:**
1. Create a Turso database at [turso.tech](https://turso.tech)
2. Get your database URL and auth token
3. Set environment variables:
   ```env
   STORAGE_TYPE=turso
   TURSO_DATABASE_URL=libsql://...
   TURSO_AUTH_TOKEN=...
   ```
4. The schema is automatically created on first use

### Storage Interface

The storage layer provides a consistent interface:

```typescript
interface IStorage {
  addLog(log: WebhookLog): Promise<void>;
  getLogs(): Promise<WebhookLog[]>;
  getLogsPaginated(page: number, pageSize: number): Promise<{...}>;
  getLogById(id: string): Promise<WebhookLog | undefined>;
  deleteLog(id: string): Promise<boolean>;
  clearLogs(): Promise<void>;
  getStats(): Promise<StorageStats>;
}
```

### Turso Implementation

Turso storage is fully implemented and ready to use. See `lib/storage/turso.ts` for the implementation.

**Features:**
- Automatic schema creation
- Optimized indexes for performance
- Automatic log cleanup (when MAX_LOGS is set)
- Full support for all storage operations

### Future Database Support

To add additional database support, implement the `IStorage` interface:

```typescript
// Example: lib/storage/postgres.ts
export class PostgresStorage implements IStorage {
  // Implement all interface methods
}
```

Then update `lib/storage/index.ts` to use it:

```typescript
case "postgres":
  storageInstance = new PostgresStorage();
  break;
```

## 2. Authentication

### Overview
API key authentication is now available for production use. Authentication is optional and can be enabled via environment variables.

### Configuration

```env
# Enable authentication (default: false, enabled if API_KEYS is set)
AUTH_ENABLED=true

# Comma-separated list of API keys
API_KEYS=key1,key2,key3
```

### Usage

#### Header-based Authentication

**Authorization Header:**
```bash
curl -X POST https://mock-webhooks.vercel.app/webhooks/test \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**X-API-Key Header:**
```bash
curl -X POST https://mock-webhooks.vercel.app/webhooks/test \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

#### Query Parameter (Less Secure)

```bash
curl -X POST "https://mock-webhooks.vercel.app/webhooks/test?apiKey=your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Error Response

When authentication fails:

```json
{
  "success": false,
  "message": "Authentication required",
  "error": "Invalid or missing API key",
  "hint": "Provide API key via Authorization header (Bearer <key>), X-API-Key header, or apiKey query parameter"
}
```

**Status Code:** 401 Unauthorized

### Protected Endpoints

All endpoints now support authentication:
- `/webhooks/**` - Webhook endpoints
- `/api/logs` - Logs API
- `/api/logs/[id]` - Individual log operations
- `/api/analytics` - Analytics API
- `/api/test` - Testing tools

## 3. Analytics Dashboard

### Overview
A comprehensive analytics dashboard provides insights into webhook activity.

### Access
Navigate to `/analytics` or click the "Analytics" button in the main dashboard.

### Features

#### Summary Cards
- **Total Logs:** Total number of webhook requests logged
- **Last 24 Hours:** Requests in the past 24 hours
- **Last Hour:** Requests in the past hour
- **Last Minute:** Requests in the past minute

#### Status Code Distribution
Visual breakdown of HTTP status codes returned:
- 2xx (Success)
- 3xx (Redirect)
- 4xx (Client Error)
- 5xx (Server Error)

#### HTTP Method Distribution
Breakdown of HTTP methods used:
- GET, POST, PUT, PATCH, DELETE

#### Top 10 Paths
Most frequently accessed webhook paths with request counts.

### API Endpoint

```bash
GET /api/analytics
```

**Response:**
```json
{
  "summary": {
    "totalLogs": 1000,
    "recentActivity": {
      "last24Hours": 500,
      "lastHour": 50,
      "lastMinute": 5
    }
  },
  "distributions": {
    "byStatus": {
      "2xx": { "count": 800, "percentage": "80.00" },
      "4xx": { "count": 150, "percentage": "15.00" },
      "5xx": { "count": 50, "percentage": "5.00" }
    },
    "byMethod": {
      "POST": { "count": 700, "percentage": "70.00" },
      "GET": { "count": 300, "percentage": "30.00" }
    }
  },
  "topPaths": [
    { "path": "/webhooks/workorder", "count": 400 },
    { "path": "/webhooks/sr/create", "count": 200 }
  ],
  "timestamp": "2024-01-20T15:15:58.526Z"
}
```

### Auto-Refresh
The dashboard automatically refreshes every 10 seconds.

## 4. Webhook Testing & Validation Tools

### Overview
Testing and validation tools for webhook requests.

### API Endpoint

```bash
POST /api/test
```

### Actions

#### 1. Replay Webhook

Replay a logged webhook request to a target URL.

**Request:**
```json
{
  "action": "replay",
  "logId": "1234567890-abc123",
  "targetUrl": "https://example.com/webhook" // Optional, defaults to original URL
}
```

**Response:**
```json
{
  "success": true,
  "action": "replay",
  "originalLog": {
    "id": "1234567890-abc123",
    "method": "POST",
    "path": "/webhooks/test",
    "timestamp": "2024-01-20T15:15:58.526Z"
  },
  "replay": {
    "status": 200,
    "statusText": "OK",
    "headers": {...},
    "body": {...}
  }
}
```

#### 2. Validate JSON Schema

Validate data against a JSON schema.

**Request:**
```json
{
  "action": "validate",
  "schema": {
    "type": "object",
    "required": ["eventId", "eventType"],
    "properties": {
      "eventId": { "type": "string" },
      "eventType": { "type": "string" },
      "entityType": { "type": "string" }
    }
  },
  "data": {
    "eventId": "123",
    "eventType": "UPDATED",
    "entityType": "WORKORDER"
  }
}
```

**Response:**
```json
{
  "success": true,
  "action": "validate",
  "validation": {
    "valid": true,
    "errors": []
  }
}
```

**Invalid Example:**
```json
{
  "success": false,
  "action": "validate",
  "validation": {
    "valid": false,
    "errors": [
      "Missing required field: eventId",
      "Expected string, got number"
    ]
  }
}
```

#### 3. Compare Logs

Compare two webhook logs to find differences.

**Request:**
```json
{
  "action": "compare",
  "logId1": "1234567890-abc123",
  "logId2": "1234567890-def456"
}
```

**Response:**
```json
{
  "success": true,
  "action": "compare",
  "differences": {
    "method": {
      "same": true,
      "values": { "log1": "POST", "log2": "POST" }
    },
    "statusCode": {
      "same": false,
      "values": { "log1": 200, "log2": 400 }
    },
    "path": {
      "same": true,
      "values": { "log1": "/webhooks/test", "log2": "/webhooks/test" }
    },
    "body": {
      "same": false,
      "differences": ["Body content differs"]
    },
    "headers": {
      "same": true,
      "differences": []
    }
  },
  "logs": {
    "log1": { "id": "1234567890-abc123", "timestamp": "..." },
    "log2": { "id": "1234567890-def456", "timestamp": "..." }
  }
}
```

### Frontend Integration

The main dashboard includes a "Replay" button for each log entry, allowing quick replay of webhook requests.

## Environment Variables Summary

```env
# Storage
STORAGE_TYPE=memory
MAX_LOGS=1000

# Authentication
AUTH_ENABLED=true
API_KEYS=key1,key2,key3

# Security (from previous updates)
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
MAX_BODY_SIZE=2097152
MAX_TIMEOUT_SECONDS=60
```

## Migration Guide

### From Old to New Storage

The storage functions are now async. Update your code:

**Before:**
```typescript
addWebhookLog(log);
const logs = getWebhookLogs();
```

**After:**
```typescript
await addWebhookLog(log);
const logs = await getWebhookLogs();
```

### Enabling Authentication

1. Set `AUTH_ENABLED=true` in environment variables
2. Add API keys: `API_KEYS=your-key-1,your-key-2`
3. Update clients to include API key in requests

### Using Analytics

1. Navigate to `/analytics` page
2. Or call `/api/test` endpoint programmatically
3. Ensure authentication is configured if enabled

## Best Practices

1. **Storage:** Use in-memory for development, consider database for production
2. **Authentication:** Always enable in production, use strong API keys
3. **Analytics:** Monitor regularly to understand usage patterns
4. **Testing:** Use replay feature to test webhook integrations
5. **Validation:** Validate webhook payloads before processing

## Future Enhancements

- Database storage implementations (PostgreSQL, MongoDB)
- User management and multiple API keys per user
- Advanced analytics (time-series data, trends)
- Webhook templates and schemas
- Automated testing workflows
- Webhook transformation rules
