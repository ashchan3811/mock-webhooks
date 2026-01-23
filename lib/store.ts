export interface WebhookLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  url: string;
  statusCode: number;
  timeout?: number;
  startTime?: string;
  endTime?: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: any;
}

// Re-export storage functions for backward compatibility
// New code should use getStorage() from lib/storage
import { getStorage } from "./storage";

export async function addWebhookLog(log: WebhookLog): Promise<void> {
  const storage = getStorage();
  await storage.addLog(log);
}

export async function getWebhookLogs(): Promise<WebhookLog[]> {
  const storage = getStorage();
  return await storage.getLogs();
}

export async function getWebhookLogsPaginated(
  page: number = 1,
  pageSize: number = 50
): Promise<{
  logs: WebhookLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}> {
  const storage = getStorage();
  return await storage.getLogsPaginated(page, pageSize);
}

export async function clearWebhookLogs(): Promise<void> {
  const storage = getStorage();
  await storage.clearLogs();
}

export async function getWebhookLogById(id: string): Promise<WebhookLog | undefined> {
  const storage = getStorage();
  return await storage.getLogById(id);
}

export async function deleteWebhookLog(id: string): Promise<boolean> {
  const storage = getStorage();
  return await storage.deleteLog(id);
}
