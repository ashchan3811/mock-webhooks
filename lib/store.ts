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

/**
 * Get paginated webhook logs
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of logs per page
 * @returns Object with logs, total count, and pagination metadata
 */
export function getWebhookLogsPaginated(
  page: number = 1,
  pageSize: number = 50
): {
  logs: WebhookLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
} {
  const total = webhookLogs.length;
  const totalPages = Math.ceil(total / pageSize);
  const pageNum = Math.max(1, Math.min(page, totalPages));
  const startIndex = (pageNum - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedLogs = webhookLogs.slice(startIndex, endIndex);

  return {
    logs: paginatedLogs,
    total,
    page: pageNum,
    pageSize,
    totalPages,
    hasMore: pageNum < totalPages,
  };
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
