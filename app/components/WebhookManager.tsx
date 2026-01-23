"use client";

import { useEffect, useState } from "react";

interface Webhook {
  id: string;
  sessionId: string;
  name: string;
  createdAt: string;
  url: string;
}

interface WebhookManagerProps {
  selectedWebhookId: string | null;
  onWebhookSelect: (webhookId: string | null) => void;
  onWebhooksChange?: (webhooks: Webhook[]) => void;
}

export default function WebhookManager({
  selectedWebhookId,
  onWebhookSelect,
  onWebhooksChange,
}: WebhookManagerProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/webhooks");
      if (response.ok) {
        const data = await response.json();
        const webhooksList = data.webhooks || [];
        setWebhooks(webhooksList);
        onWebhooksChange?.(webhooksList);
      }
    } catch (error) {
      console.error("Error fetching webhooks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookName.trim()) return;

    try {
      setCreating(true);
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: webhookName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedWebhooks = [...webhooks, data.webhook];
        setWebhooks(updatedWebhooks);
        setWebhookName("");
        setShowCreateForm(false);
        onWebhookSelect(data.webhook.id);
        onWebhooksChange?.(updatedWebhooks);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create webhook");
      }
    } catch (error) {
      console.error("Error creating webhook:", error);
      alert("Failed to create webhook");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) return;

    try {
      const response = await fetch(`/api/webhooks?webhookId=${webhookId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const updatedWebhooks = webhooks.filter((w) => w.id !== webhookId);
        setWebhooks(updatedWebhooks);
        if (selectedWebhookId === webhookId) {
          onWebhookSelect(null);
        }
        onWebhooksChange?.(updatedWebhooks);
      } else {
        alert("Failed to delete webhook");
      }
    } catch (error) {
      console.error("Error deleting webhook:", error);
      alert("Failed to delete webhook");
    }
  };

  const getWebhookUrl = (webhookId: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/webhooks/${webhookId}`;
    }
    return "";
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="animate-pulse">Loading webhooks...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-900">My Webhooks</h2>
        {!showCreateForm && webhooks.length < 3 && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Create Webhook
          </button>
        )}
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateWebhook} className="mb-4 p-4 bg-slate-50 rounded-lg">
          <div className="flex gap-2">
            <input
              type="text"
              value={webhookName}
              onChange={(e) => setWebhookName(e.target.value)}
              placeholder="Webhook name"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setWebhookName("");
              }}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {webhooks.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p className="mb-4">No webhooks created yet</p>
          {webhooks.length < 3 && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Your First Webhook
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => {
            const fullUrl = getWebhookUrl(webhook.id);
            const isSelected = selectedWebhookId === webhook.id;

            return (
              <div
                key={webhook.id}
                className={`p-4 border rounded-lg ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">
                        {webhook.name}
                      </h3>
                      {isSelected && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="mb-2">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {fullUrl}
                      </code>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => onWebhookSelect(isSelected ? null : webhook.id)}
                        className={`px-3 py-1 text-xs rounded ${
                          isSelected
                            ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        }`}
                      >
                        {isSelected ? "Deselect" : "Select"}
                      </button>
                      <button
                        onClick={() => copyToClipboard(fullUrl)}
                        className="px-3 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                      >
                        Copy URL
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {webhooks.length >= 3 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          Maximum of 3 webhooks per session reached
        </div>
      )}
    </div>
  );
}
