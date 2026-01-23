# Security Improvements

This document outlines the security enhancements implemented to address potential vulnerabilities in the Mock Webhook API.

## Implemented Security Measures

### 1. Rate Limiting ✅

**Problem:** No rate limiting made the service vulnerable to DoS attacks.

**Solution:**
- Implemented in-memory rate limiting based on client IP address
- Default: 100 requests per minute per IP (configurable via `RATE_LIMIT_REQUESTS` and `RATE_LIMIT_WINDOW_MS`)
- Returns HTTP 429 (Too Many Requests) when limit is exceeded
- Includes standard rate limit headers:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: When the rate limit window resets
  - `Retry-After`: Seconds until retry is allowed

**Configuration:**
```env
RATE_LIMIT_REQUESTS=100        # Max requests per window
RATE_LIMIT_WINDOW_MS=60000     # Window size in milliseconds (1 minute)
```

### 2. Payload Size Limits ✅

**Problem:** No payload size limits could lead to memory exhaustion.

**Solution:**
- Added configurable payload size limits for different content types:
  - JSON: 10MB default (`MAX_JSON_SIZE`)
  - Text: 10MB default (`MAX_TEXT_SIZE`)
  - Form data: 10MB default (`MAX_BODY_SIZE`)
- Validates `Content-Length` header before processing
- Validates actual payload size during parsing
- Returns HTTP 413 (Payload Too Large) when exceeded

**Configuration:**
```env
MAX_BODY_SIZE=10485760      # 10MB in bytes
MAX_JSON_SIZE=10485760      # 10MB in bytes
MAX_TEXT_SIZE=10485760      # 10MB in bytes
```

### 3. Timeout Abuse Protection ✅

**Problem:** Long timeouts could tie up server resources.

**Solution:**
- Reduced maximum timeout from 300 seconds to 60 seconds
- Added concurrent timeout request limit (default: 10 concurrent requests)
- Prevents resource exhaustion by limiting how many requests can use timeouts simultaneously
- Returns HTTP 503 (Service Unavailable) when concurrent limit is reached
- Properly tracks and releases timeout resources using try/finally

**Configuration:**
```env
MAX_TIMEOUT_SECONDS=60                    # Maximum timeout duration
MAX_CONCURRENT_TIMEOUT_REQUESTS=10        # Max concurrent timeout requests
```

### 4. XSS Protection ✅

**Problem:** User input in SVG text could be vulnerable to XSS attacks.

**Solution:**
- Enhanced XML escaping function with comprehensive character escaping
- Added text sanitization that:
  - Removes control characters
  - Limits text length (100 characters max)
  - Trims whitespace
- Added color sanitization that:
  - Validates hex color codes
  - Only allows known CSS color names
  - Falls back to safe defaults for invalid input
- All user-provided text is properly escaped before being inserted into SVG

**Implementation:**
- `escapeXml()`: Escapes all XML/HTML special characters
- `sanitizeText()`: Removes dangerous characters and limits length
- `sanitizeColor()`: Validates and sanitizes color values

## Security Configuration

All security settings are centralized in `lib/security.ts` and can be configured via environment variables:

```env
# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Payload Limits (in bytes)
MAX_BODY_SIZE=10485760
MAX_JSON_SIZE=10485760
MAX_TEXT_SIZE=10485760

# Timeout Limits
MAX_TIMEOUT_SECONDS=60
MAX_CONCURRENT_TIMEOUT_REQUESTS=10
```

## Response Headers

The API now includes security-related headers in responses:

- **Rate Limiting:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp
  - `Retry-After`: Seconds until retry (when rate limited)

## Error Responses

### Rate Limit Exceeded (429)
```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "error": "Too many requests. Please try again later.",
  "retryAfter": 45
}
```

### Payload Too Large (413)
```json
{
  "success": false,
  "message": "Payload too large",
  "error": "Request body exceeds maximum size of 10485760 bytes",
  "maxSize": 10485760
}
```

### Service Unavailable (503)
```json
{
  "success": false,
  "message": "Service temporarily unavailable",
  "error": "Too many concurrent requests with timeouts. Please try again later."
}
```

## Best Practices

1. **For Production:**
   - Adjust rate limits based on expected traffic
   - Consider using Redis or similar for distributed rate limiting
   - Monitor rate limit violations
   - Set appropriate payload size limits for your use case

2. **For Development:**
   - Default limits are reasonable for testing
   - Can be adjusted via environment variables
   - Rate limiting helps prevent accidental DoS during development

3. **Monitoring:**
   - Watch for 429 responses (rate limiting)
   - Monitor 413 responses (payload size issues)
   - Track 503 responses (timeout abuse protection)

## Limitations

- **In-Memory Rate Limiting:** Current implementation uses in-memory storage, which means:
  - Rate limits reset on server restart
  - Not suitable for distributed deployments (multiple instances)
  - For production with multiple instances, consider Redis-based rate limiting

- **IP Detection:** Relies on `X-Forwarded-For` and `X-Real-IP` headers, which can be spoofed if not behind a trusted proxy

## Future Enhancements

Potential improvements for production use:

1. **Persistent Rate Limiting:** Use Redis or similar for distributed rate limiting
2. **IP Whitelisting:** Allow certain IPs to bypass rate limits
3. **Adaptive Rate Limiting:** Adjust limits based on server load
4. **Request Signing:** Add optional request signature validation
5. **Authentication:** Add optional API key authentication
6. **Logging:** Enhanced security event logging
