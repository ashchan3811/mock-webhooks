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

// In-memory store for webhook logs
// In production, you might want to use a database or persistent storage
const webhookLogs: WebhookLog[] = [];
const MAX_LOGS = 1000; // Limit to prevent memory issues

export function addWebhookLog(log: WebhookLog): void {
  webhookLogs.unshift(log); // Add to beginning (newest first)
  
  // Keep only the most recent logs
  if (webhookLogs.length > MAX_LOGS) {
    webhookLogs.splice(MAX_LOGS);
  }
}

export function getWebhookLogs(): WebhookLog[] {
  return webhookLogs;
}

export function clearWebhookLogs(): void {
  webhookLogs.length = 0;
}

export function getWebhookLogById(id: string): WebhookLog | undefined {
  return webhookLogs.find(log => log.id === id);
}

export function deleteWebhookLog(id: string): boolean {
  const index = webhookLogs.findIndex(log => log.id === id);
  if (index !== -1) {
    webhookLogs.splice(index, 1);
    return true;
  }
  return false;
}
