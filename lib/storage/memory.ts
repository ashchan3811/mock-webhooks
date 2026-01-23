/**
 * In-memory storage implementation
 */
import { WebhookLog } from "../store";
import { IStorage, StorageStats } from "./interface";

const webhookLogs: WebhookLog[] = [];
const MAX_LOGS = parseInt(process.env.MAX_LOGS || "1000", 10);

export class MemoryStorage implements IStorage {
  async addLog(log: WebhookLog): Promise<void> {
    webhookLogs.unshift(log); // Add to beginning (newest first)
    
    // Keep only the most recent logs
    if (webhookLogs.length > MAX_LOGS) {
      webhookLogs.splice(MAX_LOGS);
    }
  }

  async getLogs(webhookId?: string): Promise<WebhookLog[]> {
    if (webhookId) {
      return webhookLogs.filter(log => log.webhookId === webhookId);
    }
    return [...webhookLogs]; // Return copy to prevent mutation
  }

  async getLogsPaginated(
    page: number = 1,
    pageSize: number = 50,
    webhookId?: string
  ): Promise<{
    logs: WebhookLog[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    const filteredLogs = webhookId 
      ? webhookLogs.filter(log => log.webhookId === webhookId)
      : webhookLogs;
    
    const total = filteredLogs.length;
    const totalPages = Math.ceil(total / pageSize);
    const pageNum = Math.max(1, Math.min(page, totalPages));
    const startIndex = (pageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    return {
      logs: [...paginatedLogs],
      total,
      page: pageNum,
      pageSize,
      totalPages,
      hasMore: pageNum < totalPages,
    };
  }

  async getLogById(id: string): Promise<WebhookLog | undefined> {
    return webhookLogs.find(log => log.id === id);
  }

  async deleteLog(id: string): Promise<boolean> {
    const index = webhookLogs.findIndex(log => log.id === id);
    if (index !== -1) {
      webhookLogs.splice(index, 1);
      return true;
    }
    return false;
  }

  async clearLogs(webhookId?: string): Promise<void> {
    if (webhookId) {
      const index = webhookLogs.length;
      for (let i = index - 1; i >= 0; i--) {
        if (webhookLogs[i].webhookId === webhookId) {
          webhookLogs.splice(i, 1);
        }
      }
    } else {
      webhookLogs.length = 0;
    }
  }

  async getStats(webhookId?: string): Promise<StorageStats> {
    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;
    const lastHour = now - 60 * 60 * 1000;
    const lastMinute = now - 60 * 1000;

    const filteredLogs = webhookId 
      ? webhookLogs.filter(log => log.webhookId === webhookId)
      : webhookLogs;

    const logsByMethod: Record<string, number> = {};
    const logsByStatus: Record<string, number> = {};
    const logsByPath: Record<string, number> = {};
    let last24HoursCount = 0;
    let lastHourCount = 0;
    let lastMinuteCount = 0;

    for (const log of filteredLogs) {
      // Count by method
      logsByMethod[log.method] = (logsByMethod[log.method] || 0) + 1;
      
      // Count by status code
      const statusGroup = `${Math.floor(log.statusCode / 100)}xx`;
      logsByStatus[statusGroup] = (logsByStatus[statusGroup] || 0) + 1;
      
      // Count by path
      logsByPath[log.path] = (logsByPath[log.path] || 0) + 1;

      // Count recent activity
      const logTime = new Date(log.timestamp).getTime();
      if (logTime >= last24Hours) last24HoursCount++;
      if (logTime >= lastHour) lastHourCount++;
      if (logTime >= lastMinute) lastMinuteCount++;
    }

    return {
      totalLogs: filteredLogs.length,
      logsByMethod,
      logsByStatus,
      logsByPath,
      recentActivity: {
        last24Hours: last24HoursCount,
        lastHour: lastHourCount,
        lastMinute: lastMinuteCount,
      },
    };
  }
}
