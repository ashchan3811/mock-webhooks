# Mock Webhook API

A simple, powerful mock webhook service for testing and development. This service allows you to receive and inspect webhook requests in real-time without setting up complex infrastructure.

**Live URL:** https://mock-webhooks.vercel.app/

## Overview

This mock webhook service provides a flexible endpoint structure that accepts any webhook path and allows you to:
- Receive webhook requests at any custom path
- Inspect request details (headers, body, query parameters)
- Simulate different HTTP status codes
- Simulate response delays
- View all requests in a clean, real-time dashboard

## Webhook URL Structure

All webhook URLs follow this pattern:

```
https://mock-webhooks.vercel.app/webhooks/{your-path}
```

### Examples

**Basic webhook:**
```
https://mock-webhooks.vercel.app/webhooks/workorder
```

**Nested path:**
```
https://mock-webhooks.vercel.app/webhooks/sr/create
```

**With query parameters:**
```
https://mock-webhooks.vercel.app/webhooks/sr/create?statusCode=400
https://mock-webhooks.vercel.app/webhooks/sr/create?timeout=20
```

## Features

### 1. Custom Status Codes

Simulate different HTTP response codes by adding a `statusCode` query parameter:

```
https://mock-webhooks.vercel.app/webhooks/sr/create?statusCode=400
https://mock-webhooks.vercel.app/webhooks/sr/create?statusCode=500
https://mock-webhooks.vercel.app/webhooks/sr/create?statusCode=529
```

**Default:** `200` (Success)

**Supported range:** `100-599`

### 2. Response Delays (Timeout)

Simulate slow responses or network delays using the `timeout` query parameter:

```
https://mock-webhooks.vercel.app/webhooks/sr/create?timeout=20
```

- **Parameter:** `timeout` (in seconds)
- **Range:** `0-300` seconds (5 minutes max)
- **Note:** Actual delay may vary by ±5 seconds due to server processing time

### 3. Combined Parameters

You can combine multiple query parameters:

```
https://mock-webhooks.vercel.app/webhooks/sr/create?statusCode=400&timeout=10
```

## Dashboard

Visit the main page to view all received webhook requests:

**Dashboard URL:** https://mock-webhooks.vercel.app/

### Features:
- **Real-time updates** - See new requests as they arrive (auto-refresh every 2 seconds)
- **Request details** - View headers, body, query parameters, and metadata
- **Copy functionality** - Copy request data or generate cURL commands
- **Search & filter** - Find specific requests quickly
- **Delete requests** - Remove individual or all requests

## Supported HTTP Methods

All standard HTTP methods are supported:
- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`

## Request Inspection

Each webhook request is logged with:
- **Method** - HTTP method used
- **Path** - Endpoint path
- **Status Code** - Response status code
- **Headers** - All request headers (x-vercel headers are filtered out)
- **Query Parameters** - URL query parameters
- **Body** - Request body (JSON, form data, or raw text)
- **Timestamp** - When the request was received

## Example Usage

### cURL Example

```bash
curl -X POST https://mock-webhooks.vercel.app/webhooks/workorder \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "46a3c44c-f9e9-4d1b-98ea-e5598455e255",
    "eventType": "UPDATED",
    "entityType": "WORKORDER",
    "entityId": "TDC78268921"
  }'
```

### JavaScript/Node.js Example

```javascript
fetch('https://mock-webhooks.vercel.app/webhooks/workorder', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    eventId: '46a3c44c-f9e9-4d1b-98ea-e5598455e255',
    eventType: 'UPDATED',
    entityType: 'WORKORDER',
    entityId: 'TDC78268921'
  })
});
```

### Python Example

```python
import requests

url = 'https://mock-webhooks.vercel.app/webhooks/workorder'
data = {
    'eventId': '46a3c44c-f9e9-4d1b-98ea-e5598455e255',
    'eventType': 'UPDATED',
    'entityType': 'WORKORDER',
    'entityId': 'TDC78268921'
}

response = requests.post(url, json=data)
print(response.status_code)
```

## Important Notes

### ⚠️ No Persistent Storage

**This service does not use a database.** All webhook logs are stored in memory only. This means:

- ✅ Requests are visible immediately after being sent
- ❌ Requests are lost when the server restarts
- ❌ Old requests cannot be retrieved after a restart
- ✅ You can always send new requests after a restart

### 🔒 Headers Filtering

The following headers are automatically filtered out and not stored:
- All headers starting with `x-vercel` (case-insensitive)

This helps keep the logs clean and focused on your actual webhook data.

## API Endpoints

### Webhook Endpoint
```
POST/GET/PUT/PATCH/DELETE /webhooks/{...path}
```
Accepts any path and logs the request.

### Logs API
```
GET /api/logs
```
Returns all logged webhook requests.

```
DELETE /api/logs
```
Clears all webhook logs.

```
DELETE /api/logs/{id}
```
Deletes a specific webhook log by ID.

## Development

### Local Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

### Environment

- **Framework:** Next.js 16
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Best Practices

1. **Use descriptive paths** - Make your webhook paths meaningful (e.g., `/webhooks/workorder/update`)

2. **Test error scenarios** - Use `statusCode` parameter to test how your application handles errors

3. **Simulate real-world delays** - Use `timeout` to test timeout handling in your application

4. **Monitor the dashboard** - Keep the dashboard open to see requests in real-time

5. **Copy cURL commands** - Use the "Copy as cURL" feature to easily recreate requests for testing

## Troubleshooting

### Request not appearing in dashboard
- Check that the URL starts with `https://mock-webhooks.vercel.app/webhooks/`
- Verify the request was actually sent (check network tab)
- Refresh the dashboard or wait for auto-refresh

### Timeout not working as expected
- Timeout accuracy is ±5 seconds due to server processing
- Maximum timeout is 300 seconds (5 minutes)
- Very short timeouts (< 1 second) may not be accurate

### Status code not working
- Ensure status code is between 100-599
- Check that the query parameter is correctly formatted: `?statusCode=400`

## Support

For issues or questions, please contact the development team or create an issue in the repository.

---

**Last Updated:** 2024
