"use client";

import { useEffect, useState, useCallback } from "react";

interface WebhookLog {
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

export default function LogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch("/api/logs");
      const data = await response.json();
      setLogs(data.logs || []);
      setSelectedLog((prev) => {
        if (data.logs && data.logs.length > 0 && !prev) {
          return data.logs[0];
        }
        return prev;
      });
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearLogs = async () => {
    if (confirm("Are you sure you want to clear all logs?")) {
      try {
        await fetch("/api/logs", { method: "DELETE" });
        setLogs([]);
        setSelectedLog(null);
      } catch (error) {
        console.error("Error clearing logs:", error);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  useEffect(() => {
    fetchLogs();
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchLogs]);

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "bg-green-100 text-green-800 border-green-200";
    if (statusCode >= 300 && statusCode < 400) return "bg-blue-100 text-blue-800 border-blue-200";
    if (statusCode >= 400 && statusCode < 500) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (statusCode >= 500) return "bg-red-100 text-red-800 border-red-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: "bg-blue-500",
      POST: "bg-green-500",
      PUT: "bg-yellow-500",
      PATCH: "bg-purple-500",
      DELETE: "bg-red-500",
    };
    return colors[method] || "bg-gray-500";
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return formatTimestamp(timestamp);
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.method.toLowerCase().includes(query) ||
      log.path.toLowerCase().includes(query) ||
      log.statusCode.toString().includes(query) ||
      log.url.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-1">Webhook Logs</h1>
              <p className="text-sm text-slate-500">
                Monitor all incoming webhook requests in real-time
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  autoRefresh
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {autoRefresh ? "🔄 Auto-refresh ON" : "⏸ Auto-refresh OFF"}
              </button>
              <button
                onClick={fetchLogs}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
              >
                ↻ Refresh
              </button>
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm"
              >
                🗑 Clear All
              </button>
            </div>
          </div>

          {/* Search */}
          {logs.length > 0 && (
            <div className="mt-4">
              <input
                type="text"
                placeholder="Search by method, path, status code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No webhook requests yet</h2>
            <p className="text-slate-500 mb-4">
              Send a request to any endpoint to see it appear here
            </p>
            <code className="bg-slate-100 px-3 py-1 rounded text-sm text-slate-700">
              POST /webhooks/test
            </code>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Logs List */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-semibold text-slate-900">
                  Requests
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({filteredLogs.length} {filteredLogs.length !== logs.length && `of ${logs.length}`})
                  </span>
                </h2>
              </div>
              <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    No requests match your search
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`p-4 cursor-pointer transition ${
                          selectedLog?.id === log.id
                            ? "bg-blue-50 border-l-4 border-blue-500"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-bold text-white ${getMethodColor(
                                  log.method
                                )}`}
                              >
                                {log.method}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold border ${getStatusColor(
                                  log.statusCode
                                )}`}
                              >
                                {log.statusCode}
                              </span>
                              {log.timeout && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                  ⏱ {log.timeout}s
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-mono text-slate-700 truncate mb-1">
                              {log.path}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{formatRelativeTime(log.timestamp)}</span>
                              <span>•</span>
                              <span>{formatTimestamp(log.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Details Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-semibold text-slate-900">
                  Request Details
                </h2>
              </div>
              {selectedLog ? (
                <div className="max-h-[calc(100vh-250px)] overflow-y-auto p-6">
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                        Basic Information
                      </h3>
                      <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium text-slate-600">Method</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold text-white ${getMethodColor(selectedLog.method)}`}>
                            {selectedLog.method}
                          </span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium text-slate-600">Path</span>
                          <code className="text-xs text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 max-w-[70%] break-all text-right">
                            {selectedLog.path}
                          </code>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium text-slate-600">Status</span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(selectedLog.statusCode)}`}>
                            {selectedLog.statusCode}
                          </span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium text-slate-600">Timestamp</span>
                          <span className="text-xs text-slate-700">
                            {formatTimestamp(selectedLog.timestamp)}
                          </span>
                        </div>
                        {selectedLog.timeout && (
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-medium text-slate-600">Timeout</span>
                            <span className="text-xs text-orange-700 font-medium">
                              {selectedLog.timeout} seconds
                            </span>
                          </div>
                        )}
                        {selectedLog.startTime && selectedLog.endTime && (
                          <>
                            <div className="flex justify-between items-start">
                              <span className="text-sm font-medium text-slate-600">Start Time</span>
                              <span className="text-xs text-slate-700">
                                {formatTimestamp(selectedLog.startTime)}
                              </span>
                            </div>
                            <div className="flex justify-between items-start">
                              <span className="text-sm font-medium text-slate-600">End Time</span>
                              <span className="text-xs text-slate-700">
                                {formatTimestamp(selectedLog.endTime)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Query Parameters */}
                    {Object.keys(selectedLog.queryParams).length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                            Query Parameters
                          </h3>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(selectedLog.queryParams, null, 2))}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Copy
                          </button>
                        </div>
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto border border-slate-700">
                          {JSON.stringify(selectedLog.queryParams, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Headers */}
                    {Object.keys(selectedLog.headers).length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                            Headers
                          </h3>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(selectedLog.headers, null, 2))}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Copy
                          </button>
                        </div>
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto border border-slate-700">
                          {JSON.stringify(selectedLog.headers, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Body */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                          Request Body
                        </h3>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              selectedLog.body === null
                                ? "null"
                                : typeof selectedLog.body === "string"
                                ? selectedLog.body
                                : JSON.stringify(selectedLog.body, null, 2)
                            )
                          }
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto border border-slate-700 min-h-[100px]">
                        {selectedLog.body === null
                          ? "null"
                          : typeof selectedLog.body === "string"
                          ? selectedLog.body
                          : JSON.stringify(selectedLog.body, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  <div className="text-4xl mb-3">👈</div>
                  <p>Select a request to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
