/**
 * Session management utilities
 */
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "webhook_session_id";
const MAX_WEBHOOKS_PER_SESSION = 3;

export interface Webhook {
  id: string;
  sessionId: string;
  name: string;
  createdAt: string;
  url: string;
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get or create session ID from cookies
 */
export async function getSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    sessionId = generateSessionId();
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return sessionId;
}

/**
 * Get session ID from request (for API routes)
 */
export function getSessionIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies[SESSION_COOKIE_NAME] || null;
}

export { MAX_WEBHOOKS_PER_SESSION };
