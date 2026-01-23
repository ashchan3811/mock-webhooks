/**
 * Security configuration and utilities
 */

// Security constants
export const SECURITY_CONFIG = {
  // Rate limiting: max requests per IP per window
  RATE_LIMIT_REQUESTS: parseInt(process.env.RATE_LIMIT_REQUESTS || "100", 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10), // 1 minute default

  // Payload size limits (in bytes)
  MAX_BODY_SIZE: parseInt(process.env.MAX_BODY_SIZE || "2097152", 10), // 2MB default
  MAX_JSON_SIZE: parseInt(process.env.MAX_JSON_SIZE || "2097152", 10), // 2MB default
  MAX_TEXT_SIZE: parseInt(process.env.MAX_TEXT_SIZE || "2097152", 10), // 2MB default

  // Timeout limits
  MAX_TIMEOUT_SECONDS: parseInt(process.env.MAX_TIMEOUT_SECONDS || "60", 10), // Reduced from 300 to 60 seconds
  MAX_CONCURRENT_TIMEOUT_REQUESTS: parseInt(process.env.MAX_CONCURRENT_TIMEOUT_REQUESTS || "10", 10), // Max concurrent requests with timeout
} as const;

/**
 * Rate limiter using in-memory storage
 * Tracks requests per IP address
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up old rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS);

/**
 * Check if request should be rate limited
 * @param identifier - IP address or other identifier
 * @returns true if request should be allowed, false if rate limited
 */
export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired entry
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: SECURITY_CONFIG.RATE_LIMIT_REQUESTS - 1,
      resetTime: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS,
    };
  }

  if (entry.count >= SECURITY_CONFIG.RATE_LIMIT_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: SECURITY_CONFIG.RATE_LIMIT_REQUESTS - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback to a default identifier if IP cannot be determined
  return "unknown";
}

/**
 * Track concurrent requests with timeouts to prevent resource exhaustion
 */
let activeTimeoutRequests = 0;

export function canStartTimeoutRequest(): boolean {
  return activeTimeoutRequests < SECURITY_CONFIG.MAX_CONCURRENT_TIMEOUT_REQUESTS;
}

export function startTimeoutRequest(): void {
  activeTimeoutRequests++;
}

export function endTimeoutRequest(): void {
  if (activeTimeoutRequests > 0) {
    activeTimeoutRequests--;
  }
}

/**
 * Validate payload size
 */
export function validatePayloadSize(size: number, maxSize: number = SECURITY_CONFIG.MAX_BODY_SIZE): boolean {
  return size <= maxSize;
}

/**
 * Get content length from request headers
 */
export function getContentLength(request: Request): number | null {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return null;
  const size = parseInt(contentLength, 10);
  return isNaN(size) ? null : size;
}
