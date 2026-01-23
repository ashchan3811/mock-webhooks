/**
 * Storage interface for webhook logs
 * Allows switching between in-memory and database storage
 */
import { WebhookLog } from "../store";

export interface IStorage {
  addLog(log: WebhookLog): Promise<void>;
  getLogs(webhookId?: string): Promise<WebhookLog[]>;
  getLogsPaginated(page: number, pageSize: number, webhookId?: string): Promise<{
    logs: WebhookLog[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
  }>;
  getLogById(id: string): Promise<WebhookLog | undefined>;
  deleteLog(id: string): Promise<boolean>;
  clearLogs(webhookId?: string): Promise<void>;
  getStats(webhookId?: string): Promise<StorageStats>;
}

export interface StorageStats {
  totalLogs: number;
  logsByMethod: Record<string, number>;
  logsByStatus: Record<string, number>;
  logsByPath: Record<string, number>;
  recentActivity: {
    last24Hours: number;
    lastHour: number;
    lastMinute: number;
  };
}
