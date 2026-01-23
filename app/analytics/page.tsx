"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  summary: {
    totalLogs: number;
    recentActivity: {
      last24Hours: number;
      lastHour: number;
      lastMinute: number;
    };
  };
  distributions: {
    byStatus: Record<string, { count: number; percentage: string }>;
    byMethod: Record<string, { count: number; percentage: string }>;
  };
  topPaths: Array<{ path: string; count: number }>;
  timestamp: string;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/analytics");
      if (!response.ok) {
        if (response.status === 401) {
          setError("Authentication required. Please configure API keys.");
        } else {
          setError("Failed to fetch analytics");
        }
        return;
      }
      const data = await response.json();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError("Error fetching analytics");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-red-600 mb-4">⚠️ {error}</div>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-slate-500 mb-1">Total Logs</div>
            <div className="text-3xl font-bold text-slate-900">{analytics.summary.totalLogs}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-slate-500 mb-1">Last 24 Hours</div>
            <div className="text-3xl font-bold text-blue-600">{analytics.summary.recentActivity.last24Hours}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-slate-500 mb-1">Last Hour</div>
            <div className="text-3xl font-bold text-green-600">{analytics.summary.recentActivity.lastHour}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-slate-500 mb-1">Last Minute</div>
            <div className="text-3xl font-bold text-orange-600">{analytics.summary.recentActivity.lastMinute}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Code Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Status Code Distribution</h2>
            <div className="space-y-3">
              {Object.entries(analytics.distributions.byStatus)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([status, data]) => (
                  <div key={status}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{status}</span>
                      <span className="text-slate-600">
                        {data.count} ({data.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${data.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Method Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">HTTP Method Distribution</h2>
            <div className="space-y-3">
              {Object.entries(analytics.distributions.byMethod)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([method, data]) => (
                  <div key={method}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{method}</span>
                      <span className="text-slate-600">
                        {data.count} ({data.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${data.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Top Paths */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Top 10 Paths</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Path</th>
                    <th className="text-right py-2 px-4">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topPaths.map(({ path, count }) => (
                    <tr key={path} className="border-b">
                      <td className="py-2 px-4 font-mono text-sm">{path}</td>
                      <td className="py-2 px-4 text-right">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm text-slate-500 text-center">
          Last updated: {new Date(analytics.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
