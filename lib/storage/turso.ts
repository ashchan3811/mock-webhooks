/**
 * Turso (libSQL) storage implementation
 */
import { createClient } from "@libsql/client";
import { WebhookLog } from "../store";
import { IStorage, StorageStats } from "./interface";

export class TursoStorage implements IStorage {
  private client;
  private initialized: boolean = false;

  constructor() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error(
        "Turso configuration missing. Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables."
      );
    }

    this.client = createClient({
      url,
      authToken,
    });
  }

  /**
   * Initialize database schema if not already initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create webhook_logs table if it doesn't exist
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS webhook_logs (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          method TEXT NOT NULL,
          path TEXT NOT NULL,
          url TEXT NOT NULL,
          status_code INTEGER NOT NULL,
          timeout INTEGER,
          start_time TEXT,
          end_time TEXT,
          headers TEXT NOT NULL,
          query_params TEXT NOT NULL,
          body TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);

      // Create indexes for better query performance
      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_webhook_logs_timestamp 
        ON webhook_logs(timestamp DESC)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_webhook_logs_method 
        ON webhook_logs(method)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_webhook_logs_status_code 
        ON webhook_logs(status_code)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_webhook_logs_path 
        ON webhook_logs(path)
      `);

      this.initialized = true;
    } catch (error) {
      console.error("Error initializing Turso database:", error);
      throw error;
    }
  }

  async addLog(log: WebhookLog): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.client.execute({
        sql: `
          INSERT INTO webhook_logs (
            id, timestamp, method, path, url, status_code, timeout,
            start_time, end_time, headers, query_params, body
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          log.id,
          log.timestamp,
          log.method,
          log.path,
          log.url,
          log.statusCode,
          log.timeout || null,
          log.startTime || null,
          log.endTime || null,
          JSON.stringify(log.headers),
          JSON.stringify(log.queryParams),
          log.body !== null ? JSON.stringify(log.body) : null,
        ],
      });

      // Optional: Clean up old logs if MAX_LOGS is set
      const maxLogs = parseInt(process.env.MAX_LOGS || "0", 10);
      if (maxLogs > 0) {
        await this.client.execute({
          sql: `
            DELETE FROM webhook_logs
            WHERE id NOT IN (
              SELECT id FROM webhook_logs
              ORDER BY timestamp DESC
              LIMIT ?
            )
          `,
          args: [maxLogs],
        });
      }
    } catch (error) {
      console.error("Error adding log to Turso:", error);
      throw error;
    }
  }

  async getLogs(): Promise<WebhookLog[]> {
    await this.ensureInitialized();

    try {
      const result = await this.client.execute({
        sql: `
          SELECT 
            id, timestamp, method, path, url, status_code, timeout,
            start_time, end_time, headers, query_params, body
          FROM webhook_logs
          ORDER BY timestamp DESC
        `,
        args: [],
      });

      return result.rows.map((row) => this.rowToLog(row));
    } catch (error) {
      console.error("Error fetching logs from Turso:", error);
      throw error;
    }
  }

  async getLogsPaginated(
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
    await this.ensureInitialized();

    try {
      // Get total count
      const countResult = await this.client.execute({
        sql: "SELECT COUNT(*) as total FROM webhook_logs",
        args: [],
      });
      const total = (countResult.rows[0]?.total as number) || 0;

      // Calculate pagination
      const totalPages = Math.ceil(total / pageSize);
      const pageNum = Math.max(1, Math.min(page, totalPages));
      const offset = (pageNum - 1) * pageSize;

      // Get paginated logs
      const result = await this.client.execute({
        sql: `
          SELECT 
            id, timestamp, method, path, url, status_code, timeout,
            start_time, end_time, headers, query_params, body
          FROM webhook_logs
          ORDER BY timestamp DESC
          LIMIT ? OFFSET ?
        `,
        args: [pageSize, offset],
      });

      const logs = result.rows.map((row) => this.rowToLog(row));

      return {
        logs,
        total,
        page: pageNum,
        pageSize,
        totalPages,
        hasMore: pageNum < totalPages,
      };
    } catch (error) {
      console.error("Error fetching paginated logs from Turso:", error);
      throw error;
    }
  }

  async getLogById(id: string): Promise<WebhookLog | undefined> {
    await this.ensureInitialized();

    try {
      const result = await this.client.execute({
        sql: `
          SELECT 
            id, timestamp, method, path, url, status_code, timeout,
            start_time, end_time, headers, query_params, body
          FROM webhook_logs
          WHERE id = ?
        `,
        args: [id],
      });

      if (result.rows.length === 0) {
        return undefined;
      }

      return this.rowToLog(result.rows[0]);
    } catch (error) {
      console.error("Error fetching log by ID from Turso:", error);
      throw error;
    }
  }

  async deleteLog(id: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const result = await this.client.execute({
        sql: "DELETE FROM webhook_logs WHERE id = ?",
        args: [id],
      });

      return (result.rowsAffected || 0) > 0;
    } catch (error) {
      console.error("Error deleting log from Turso:", error);
      throw error;
    }
  }

  async clearLogs(): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.client.execute("DELETE FROM webhook_logs");
    } catch (error) {
      console.error("Error clearing logs from Turso:", error);
      throw error;
    }
  }

  async getStats(): Promise<StorageStats> {
    await this.ensureInitialized();

    try {
      const now = Date.now();
      const last24Hours = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      const lastHour = new Date(now - 60 * 60 * 1000).toISOString();
      const lastMinute = new Date(now - 60 * 1000).toISOString();

      // Get total count
      const totalResult = await this.client.execute({
        sql: "SELECT COUNT(*) as total FROM webhook_logs",
        args: [],
      });
      const totalLogs = Number(totalResult.rows[0]?.total) || 0;

      // Get counts by method
      const methodResult = await this.client.execute({
        sql: `
          SELECT method, COUNT(*) as count
          FROM webhook_logs
          GROUP BY method
        `,
        args: [],
      });
      const logsByMethod: Record<string, number> = {};
      for (const row of methodResult.rows) {
        logsByMethod[row.method as string] = Number(row.count) || 0;
      }

      // Get counts by status code (grouped by 100s)
      const statusResult = await this.client.execute({
        sql: `
          SELECT 
            CAST(status_code / 100 AS TEXT) || 'xx' as status_group,
            COUNT(*) as count
          FROM webhook_logs
          GROUP BY status_group
        `,
        args: [],
      });
      const logsByStatus: Record<string, number> = {};
      for (const row of statusResult.rows) {
        logsByStatus[row.status_group as string] = Number(row.count) || 0;
      }

      // Get counts by path
      const pathResult = await this.client.execute({
        sql: `
          SELECT path, COUNT(*) as count
          FROM webhook_logs
          GROUP BY path
        `,
        args: [],
      });
      const logsByPath: Record<string, number> = {};
      for (const row of pathResult.rows) {
        logsByPath[row.path as string] = Number(row.count) || 0;
      }

      // Get recent activity counts
      const recent24hResult = await this.client.execute({
        sql: `
          SELECT COUNT(*) as count
          FROM webhook_logs
          WHERE timestamp >= ?
        `,
        args: [last24Hours],
      });
      const last24HoursCount = Number(recent24hResult.rows[0]?.count) || 0;

      const recentHourResult = await this.client.execute({
        sql: `
          SELECT COUNT(*) as count
          FROM webhook_logs
          WHERE timestamp >= ?
        `,
        args: [lastHour],
      });
      const lastHourCount = Number(recentHourResult.rows[0]?.count) || 0;

      const recentMinuteResult = await this.client.execute({
        sql: `
          SELECT COUNT(*) as count
          FROM webhook_logs
          WHERE timestamp >= ?
        `,
        args: [lastMinute],
      });
      const lastMinuteCount = Number(recentMinuteResult.rows[0]?.count) || 0;

      return {
        totalLogs,
        logsByMethod,
        logsByStatus,
        logsByPath,
        recentActivity: {
          last24Hours: last24HoursCount,
          lastHour: lastHourCount,
          lastMinute: lastMinuteCount,
        },
      };
    } catch (error) {
      console.error("Error fetching stats from Turso:", error);
      throw error;
    }
  }

  /**
   * Convert database row to WebhookLog
   */
  private rowToLog(row: any): WebhookLog {
    return {
      id: row.id as string,
      timestamp: row.timestamp as string,
      method: row.method as string,
      path: row.path as string,
      url: row.url as string,
      statusCode: row.status_code as number,
      timeout: row.timeout ? (row.timeout as number) : undefined,
      startTime: row.start_time ? (row.start_time as string) : undefined,
      endTime: row.end_time ? (row.end_time as string) : undefined,
      headers: JSON.parse(row.headers as string),
      queryParams: JSON.parse(row.query_params as string),
      body: row.body ? JSON.parse(row.body as string) : null,
    };
  }
}
