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

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds default
  const [usePagination, setUsePagination] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const url = usePagination
        ? `/api/logs?paginate=true&page=${currentPage}&pageSize=${pageSize}`
        : "/api/logs";
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401) {
          alert("Authentication required. Please configure API keys in environment variables.");
        }
        return;
      }
      const data = await response.json();
      
      if (usePagination && data.logs) {
        // Paginated response
        setLogs(data.logs || []);
        setPaginationMeta({
          total: data.total,
          page: data.page,
          pageSize: data.pageSize,
          totalPages: data.totalPages,
          hasMore: data.hasMore,
        });
      } else {
        // Non-paginated response (backward compatibility)
        setLogs(data.logs || []);
        setPaginationMeta(null);
      }
      
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
  }, [usePagination, currentPage, pageSize]);

  const clearLogs = async () => {
    if (confirm("Are you sure you want to clear all logs?")) {
      try {
        const response = await fetch("/api/logs", { method: "DELETE" });
        if (!response.ok) {
          if (response.status === 401) {
            alert("Authentication required. Please configure API keys.");
          } else {
            alert("Failed to clear logs");
          }
          return;
        }
        setLogs([]);
        setSelectedLog(null);
      } catch (error) {
        console.error("Error clearing logs:", error);
        alert("Error clearing logs");
      }
    }
  };

  const deleteLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection when clicking delete
    if (confirm("Are you sure you want to delete this log?")) {
      try {
        const response = await fetch(`/api/logs/${id}`, { method: "DELETE" });
        if (!response.ok) {
          if (response.status === 401) {
            alert("Authentication required. Please configure API keys.");
          } else {
            alert("Failed to delete log");
          }
          return;
        }
        setLogs((prev) => prev.filter((log) => log.id !== id));
        if (selectedLog?.id === id) {
          setSelectedLog(null);
        }
      } catch (error) {
        console.error("Error deleting log:", error);
        alert("Error deleting log");
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const getWebhookUrl = () => {
    if (typeof window !== "undefined") {
      const baseUrl = window.location.origin;
      return `${baseUrl}/webhooks/test`;
    }
    return "";
  };

  const getCurlCommand = () => {
    const url = getWebhookUrl();
    return `curl -X POST ${url} \\
  -H "Content-Type: application/json" \\
  -d '{
    "eventId": "example-event-id",
    "eventType": "UPDATED",
    "entityType": "WORKORDER",
    "entityId": "EXAMPLE123"
  }'`;
  };

  const copyCurlCommand = () => {
    const curlCommand = getCurlCommand();
    copyToClipboard(curlCommand);
  };

  useEffect(() => {
    fetchLogs();
    
    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(() => {
      fetchLogs();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchLogs]);

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
      <div className="max-w-8xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">Webhook Logs</h1>
                <a
                  href="/analytics"
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  📊 Analytics
                </a>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Monitor all incoming webhook requests in real-time
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                  autoRefresh
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {autoRefresh ? `🔄 Auto-refresh (${refreshInterval / 1000}s)` : "⏸ Auto-refresh OFF"}
              </button>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!autoRefresh}
              >
                <option value={2000}>2s (Fast)</option>
                <option value={5000}>5s (Default)</option>
                <option value={10000}>10s (Slow)</option>
                <option value={30000}>30s (Very Slow)</option>
              </select>
              <button
                onClick={() => {
                  setUsePagination(!usePagination);
                  setCurrentPage(1); // Reset to first page when toggling
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                  usePagination
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {usePagination ? "📄 Paginated" : "📋 All Logs"}
              </button>
              <button
                onClick={fetchLogs}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm cursor-pointer"
              >
                ↻ Refresh
              </button>
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm cursor-pointer"
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
            <div className="flex flex-col items-center gap-3">
              <code className="bg-slate-100 px-3 py-1 rounded text-sm text-slate-700">
                POST /webhooks/test
              </code>
              <button
                onClick={copyCurlCommand}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="5" width="9" height="9" rx="1" />
                  <path d="M3 3v9h9" />
                </svg>
                Copy cURL Command
              </button>
              <div className="mt-2 text-left max-w-2xl w-full">
                <p className="text-xs text-slate-500 mb-2">Example cURL command:</p>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto border border-slate-700">
                  {getCurlCommand()}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Logs List */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-2 py-1.5 border-b border-slate-200 bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-900">
                  Requests
                  <span className="ml-1.5 text-xs font-normal text-slate-500">
                    {paginationMeta
                      ? `(Page ${paginationMeta.page} of ${paginationMeta.totalPages}, ${paginationMeta.total} total)`
                      : `(${filteredLogs.length} ${filteredLogs.length !== logs.length ? `of ${logs.length}` : ""})`}
                  </span>
                </h2>
              </div>
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    No requests match your search
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`px-2 py-1.5 cursor-pointer transition ${
                          selectedLog?.id === log.id
                            ? "bg-blue-50 border-l-2 border-blue-500"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-0.5">
                              <span
                                className={`px-1 py-0.5 rounded text-xs font-bold text-white ${getMethodColor(
                                  log.method
                                )}`}
                              >
                                {log.method}
                              </span>
                              <span
                                className={`px-1 py-0.5 rounded text-xs font-semibold border ${getStatusColor(
                                  log.statusCode
                                )}`}
                              >
                                {log.statusCode}
                              </span>
                              {log.timeout && (
                                <span className="px-1 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                  ⏱ {log.timeout}s
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-slate-700 truncate mb-0">
                              {log.path}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <span>{formatRelativeTime(log.timestamp)}</span>
                              <span>•</span>
                              <span>{formatTimestamp(log.timestamp)}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => deleteLog(log.id, e)}
                            className="text-gray-400 hover:text-red-500 transition shrink-0 ml-1 cursor-pointer"
                            title="Delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M5.5 4.5h-1a1 1 0 00-1 1v8a1 1 0 001 1h7a1 1 0 001-1v-8a1 1 0 00-1-1h-1M5.5 4.5V3a1 1 0 011-1h3a1 1 0 011 1v1.5M5.5 4.5h5M6.5 7.5v4M9.5 7.5v4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Pagination Controls */}
              {usePagination && paginationMeta && paginationMeta.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Page size:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ««
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ‹ Prev
                    </button>
                    <span className="text-xs text-slate-600 px-2">
                      Page {paginationMeta.page} of {paginationMeta.totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(paginationMeta.totalPages, currentPage + 1))}
                      disabled={!paginationMeta.hasMore}
                      className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next ›
                    </button>
                    <button
                      onClick={() => setCurrentPage(paginationMeta.totalPages)}
                      disabled={!paginationMeta.hasMore}
                      className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      »»
                    </button>
                  </div>
                </div>
              )}
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
                            className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
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
                            className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
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
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch("/api/test", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    action: "replay",
                                    logId: selectedLog.id,
                                  }),
                                });
                                const data = await response.json();
                                if (data.success) {
                                  alert(`Replay successful! Status: ${data.replay.status}`);
                                } else {
                                  alert(`Replay failed: ${data.error}`);
                                }
                              } catch (error) {
                                alert("Failed to replay webhook");
                              }
                            }}
                            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                          >
                            🔄 Replay
                          </button>
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
                            className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                          >
                            Copy
                          </button>
                        </div>
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
