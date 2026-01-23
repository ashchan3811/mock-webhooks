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
- Generate placeholder SVG images for testing and development

## Webhook URL Structure

The service uses a catch-all route that accepts any path after `/webhooks/`. You can use any path structure you need.

**Base URL Pattern:**
```
https://mock-webhooks.vercel.app/webhooks/{any-path}
```

### Examples

**Basic webhook:**
```
https://mock-webhooks.vercel.app/webhooks/workorder
```

**Nested path (multiple levels):**
```
https://mock-webhooks.vercel.app/webhooks/sr/create
https://mock-webhooks.vercel.app/webhooks/workorder/update/123
https://mock-webhooks.vercel.app/webhooks/api/v1/events
```

**Root webhook path (no additional path):**
```
https://mock-webhooks.vercel.app/webhooks
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

**Validation:** If an invalid status code is provided (outside 100-599), it defaults to `200`.

### 2. Response Delays (Timeout)

Simulate slow responses or network delays using the `timeout` query parameter:

```
https://mock-webhooks.vercel.app/webhooks/sr/create?timeout=20
```

- **Parameter:** `timeout` (in seconds)
- **Range:** `0-60` seconds (1 minute max, reduced for security)
- **Default:** `0` (no delay)
- **Validation:** If timeout is negative or exceeds 60 seconds, it defaults to `0`
- **Note:** The timeout is applied before sending the response. The server will wait for the specified duration, then respond with the configured status code.
- **Security:** Maximum of 10 concurrent requests with timeouts allowed to prevent resource exhaustion

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

## Request Body Handling

The service automatically parses request bodies based on the `Content-Type` header:

| Content-Type | Parsing Behavior |
|--------------|------------------|
| `application/json` | Parsed as JSON object |
| `application/x-www-form-urlencoded` | Parsed as key-value object |
| `multipart/form-data` | Parsed as key-value object |
| Other types | Stored as raw text string |
| No body / `null` | Stored as `null` |

**Examples:**

**JSON Body:**
```bash
curl -X POST https://mock-webhooks.vercel.app/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

**Form Data:**
```bash
curl -X POST https://mock-webhooks.vercel.app/webhooks/test \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "key=value&another=param"
```

**Raw Text:**
```bash
curl -X POST https://mock-webhooks.vercel.app/webhooks/test \
  -H "Content-Type: text/plain" \
  -d "raw text content"
```

## Request Inspection

Each webhook request is logged with:
- **Method** - HTTP method used (GET, POST, PUT, PATCH, DELETE)
- **Path** - Endpoint path (e.g., `/webhooks/workorder`)
- **URL** - Full request URL including query parameters
- **Status Code** - Response status code returned
- **Headers** - All request headers (x-vercel headers are automatically filtered out)
- **Query Parameters** - All URL query parameters (including `statusCode` and `timeout` if used)
- **Body** - Request body parsed based on Content-Type:
  - `application/json` → Parsed as JSON object
  - `application/x-www-form-urlencoded` → Parsed as key-value object
  - `multipart/form-data` → Parsed as key-value object
  - Other content types → Stored as raw text
- **Timestamp** - ISO timestamp when the request was received
- **Timeout** - If timeout was used, shows the delay duration and start/end times

## Response Format

The webhook endpoint returns a JSON response with the following structure:

```json
{
  "success": true,
  "message": "Webhook received successfully",
  "path": "/webhooks/workorder",
  "method": "POST",
  "statusCode": 200,
  "timeout": 0,
  "timestamp": "2024-01-20T15:15:58.526Z",
  "data": {
    "body": { /* your request body */ }
  }
}
```

**If timeout was used, additional fields are included:**
```json
{
  "success": true,
  "message": "Webhook received successfully",
  "path": "/webhooks/workorder",
  "method": "POST",
  "statusCode": 200,
  "timeout": 20,
  "timestamp": "2024-01-20T15:15:58.526Z",
  "startTime": "2024-01-20T15:15:58.526Z",
  "endTime": "2024-01-20T15:16:18.530Z",
  "data": {
    "body": { /* your request body */ }
  }
}
```

## Example Usage

### Image Placeholder Examples

**Basic placeholder (rectangle):**
```html
<img src="https://mock-webhooks.vercel.app/images/600x400" alt="Placeholder" />
```

**Square placeholder (single dimension):**
```html
<img src="https://mock-webhooks.vercel.app/images/600" alt="Square placeholder" />
```

**With custom colors (hex codes):**
```html
<img src="https://mock-webhooks.vercel.app/images/600x400?bg=FF0000&textColor=FFFFFF" alt="Red placeholder" />
```

**With custom colors (CSS color names):**
```html
<img src="https://mock-webhooks.vercel.app/images/600x400?bg=red&textColor=white" alt="Red placeholder" />
<img src="https://mock-webhooks.vercel.app/images/600x400?bg=navy&textColor=yellow" alt="Navy placeholder" />
```

**With custom text:**
```html
<img src="https://mock-webhooks.vercel.app/images/600x400?text=Custom+Text" alt="Custom placeholder" />
```

### Webhook cURL Example

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
- ✅ Up to 1,000 most recent requests are kept (oldest are automatically removed)
- ✅ Requests are stored newest-first for easy access
- ❌ Requests are lost when the server restarts
- ❌ Old requests cannot be retrieved after a restart
- ✅ You can always send new requests after a restart

**Storage Limits:**
- Maximum of 1,000 logs stored at any time
- When the limit is reached, oldest logs are automatically removed
- Each log includes a unique ID for reference

### 🔒 Headers Filtering

The following headers are automatically filtered out and not stored:
- All headers starting with `x-vercel` (case-insensitive)

This helps keep the logs clean and focused on your actual webhook data.

### 🛡️ Security Features

The service includes several security measures to prevent abuse:

**Rate Limiting:**
- Default: 100 requests per minute per IP address
- Returns HTTP 429 (Too Many Requests) when limit is exceeded
- Configurable via environment variables (see `SECURITY.md`)

**Payload Size Limits:**
- Maximum payload size: 10MB (configurable)
- Returns HTTP 413 (Payload Too Large) when exceeded
- Separate limits for JSON, text, and form data

**Timeout Protection:**
- Maximum timeout reduced to 60 seconds (from 300)
- Limits concurrent requests with timeouts (default: 10)
- Prevents resource exhaustion from timeout abuse

**XSS Protection:**
- All user input in SVG placeholders is sanitized
- Text input is escaped and length-limited
- Color values are validated against whitelist

For detailed security information, see [SECURITY.md](./SECURITY.md).

## API Endpoints

### Webhook Endpoint
```
GET/POST/PUT/PATCH/DELETE /webhooks/{...path}
```

**Route Pattern:** Catch-all route `[[...slug]]` that accepts any path structure.

**Behavior:**
- Accepts any path after `/webhooks/` (e.g., `/webhooks/workorder`, `/webhooks/sr/create`)
- If no path is provided, defaults to `/webhooks`
- Logs the request with all details
- Returns JSON response with request information
- Supports query parameters for `statusCode` and `timeout`

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

### Image Placeholder API
```
GET /images/{WIDTH}x{HEIGHT}
GET /images/{SIZE}
```
Generates a placeholder SVG image with the specified dimensions.

**Format:**
- `WIDTHxHEIGHT` - Rectangular image (e.g., `600x400`)
- `SIZE` - Square image (e.g., `600` creates a 600x600 image)

**Examples:**
```
GET /images/600x400    # 600x400 rectangle
GET /images/800x600    # 800x600 rectangle
GET /images/200        # 200x200 square
GET /images/500        # 500x500 square
```

**Query Parameters:**
- `bg` - Background color (hex code or CSS color name, with or without #). Default: `DDDDDD`
- `textColor` - Text color (hex code or CSS color name, with or without #). Default: `999999`
- `text` - Custom text to display. Default: `{WIDTH}x{HEIGHT}` or `{SIZE}` for squares

**Color Formats Supported:**
- Hex codes: `FF0000`, `#FF0000`, `#F00` (3-digit shorthand)
- CSS color names: `red`, `blue`, `green`, `yellow`, `orange`, `purple`, etc.

**Examples with query parameters:**
```
GET /images/600x400?bg=FF0000&textColor=FFFFFF
GET /images/600x400?bg=red&textColor=white
GET /images/600x400?bg=#336699&textColor=#FFFFFF
GET /images/600x400?bg=navy&textColor=yellow&text=Placeholder
GET /images/600x400?bg=darkblue&textColor=lightblue
```

**Response:**
- Content-Type: `image/svg+xml`
- Returns an SVG image with the specified dimensions
- Dimensions must be between 1 and 10,000 pixels

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
- Maximum timeout is 300 seconds (5 minutes)
- Timeout value must be between 0-300 seconds
- Invalid timeout values default to 0 (no delay)
- The timeout is applied server-side before the response is sent
- For very short timeouts, actual delay may vary slightly due to server processing overhead

### Status code not working
- Ensure status code is between 100-599
- Check that the query parameter is correctly formatted: `?statusCode=400`
- Invalid status codes (outside 100-599) will default to `200`
- Status code must be a valid integer

## Support

For issues or questions, please contact the development team or create an issue in the repository.

---

**Last Updated:** 2024
