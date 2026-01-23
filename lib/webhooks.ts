/**
 * Webhook management storage
 */
import { Webhook } from "./session";
import { getStorage } from "./storage";

// In-memory storage for webhooks (could be moved to database)
const webhooks: Map<string, Webhook[]> = new Map(); // sessionId -> Webhook[]

export async function createWebhook(
  sessionId: string,
  name: string
): Promise<Webhook> {
  const sessionWebhooks = webhooks.get(sessionId) || [];

  if (sessionWebhooks.length >= 3) {
    throw new Error("Maximum of 3 webhooks per session allowed");
  }

  const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const webhook: Webhook = {
    id: webhookId,
    sessionId,
    name,
    createdAt: new Date().toISOString(),
    url: `/webhooks/${webhookId}`,
  };

  sessionWebhooks.push(webhook);
  webhooks.set(sessionId, sessionWebhooks);

  return webhook;
}

export function getWebhooksBySession(sessionId: string): Webhook[] {
  return webhooks.get(sessionId) || [];
}

export function getWebhookById(webhookId: string): Webhook | undefined {
  for (const sessionWebhooks of webhooks.values()) {
    const webhook = sessionWebhooks.find((w) => w.id === webhookId);
    if (webhook) return webhook;
  }
  return undefined;
}

export function deleteWebhook(sessionId: string, webhookId: string): boolean {
  const sessionWebhooks = webhooks.get(sessionId);
  if (!sessionWebhooks) return false;

  const index = sessionWebhooks.findIndex((w) => w.id === webhookId);
  if (index === -1) return false;

  sessionWebhooks.splice(index, 1);
  if (sessionWebhooks.length === 0) {
    webhooks.delete(sessionId);
  } else {
    webhooks.set(sessionId, sessionWebhooks);
  }

  return true;
}

/**
 * Extract webhook_id from path
 * Path format: /webhooks/{webhook_id}/...
 */
export function extractWebhookIdFromPath(path: string): string | null {
  const match = path.match(/^\/webhooks\/(webhook_[^\/]+)/);
  return match ? match[1] : null;
}
