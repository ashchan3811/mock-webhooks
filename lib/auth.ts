/**
 * Authentication utilities
 */

// API Keys configuration
const API_KEYS = (process.env.API_KEYS || "").split(",").filter(Boolean);
const AUTH_ENABLED = process.env.AUTH_ENABLED === "true" || API_KEYS.length > 0;

/**
 * Validate API key from request
 */
export function validateApiKey(request: Request): boolean {
  if (!AUTH_ENABLED) {
    return true; // Authentication disabled
  }

  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    // Support "Bearer <token>" or "ApiKey <token>" format
    const token = authHeader.replace(/^(Bearer|ApiKey)\s+/i, "").trim();
    if (API_KEYS.includes(token)) {
      return true;
    }
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get("x-api-key");
  if (apiKeyHeader && API_KEYS.includes(apiKeyHeader)) {
    return true;
  }

  // Check query parameter (less secure, but convenient for testing)
  const url = new URL(request.url);
  const apiKeyParam = url.searchParams.get("apiKey");
  if (apiKeyParam && API_KEYS.includes(apiKeyParam)) {
    return true;
  }

  return false;
}

/**
 * Check if authentication is enabled
 */
export function isAuthEnabled(): boolean {
  return AUTH_ENABLED;
}

/**
 * Get authentication error response
 */
export function getAuthErrorResponse() {
  return {
    success: false,
    message: "Authentication required",
    error: "Invalid or missing API key",
    hint: "Provide API key via Authorization header (Bearer <key>), X-API-Key header, or apiKey query parameter",
  };
}
