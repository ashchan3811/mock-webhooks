import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { validateApiKey, getAuthErrorResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Authentication check
  if (!validateApiKey(request)) {
    return NextResponse.json(getAuthErrorResponse(), { status: 401 });
  }

  try {
    const storage = getStorage();
    const stats = await storage.getStats();

    // Calculate additional metrics
    const statusCodeDistribution = Object.entries(stats.logsByStatus).reduce(
      (acc, [status, count]) => {
        acc[status] = {
          count,
          percentage: stats.totalLogs > 0 
            ? ((count / stats.totalLogs) * 100).toFixed(2) 
            : "0.00",
        };
        return acc;
      },
      {} as Record<string, { count: number; percentage: string }>
    );

    const methodDistribution = Object.entries(stats.logsByMethod).reduce(
      (acc, [method, count]) => {
        acc[method] = {
          count,
          percentage: stats.totalLogs > 0 
            ? ((count / stats.totalLogs) * 100).toFixed(2) 
            : "0.00",
        };
        return acc;
      },
      {} as Record<string, { count: number; percentage: string }>
    );

    // Top paths
    const topPaths = Object.entries(stats.logsByPath)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    return NextResponse.json({
      summary: {
        totalLogs: stats.totalLogs,
        recentActivity: stats.recentActivity,
      },
      distributions: {
        byStatus: statusCodeDistribution,
        byMethod: methodDistribution,
      },
      topPaths,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch analytics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
