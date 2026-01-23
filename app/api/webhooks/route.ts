import { NextRequest, NextResponse } from "next/server";
import { getSessionIdFromRequest } from "@/lib/session";
import {
  createWebhook,
  getWebhooksBySession,
  deleteWebhook,
} from "@/lib/webhooks";
import { MAX_WEBHOOKS_PER_SESSION } from "@/lib/session";

export async function GET(request: NextRequest) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 401 }
    );
  }

  const webhooks = getWebhooksBySession(sessionId);
  return NextResponse.json({ webhooks });
}

export async function POST(request: NextRequest) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Webhook name is required" },
        { status: 400 }
      );
    }

    const webhook = await createWebhook(sessionId, name.trim());
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Maximum")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    console.error("Error creating webhook:", error);
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("webhookId");

    if (!webhookId) {
      return NextResponse.json(
        { error: "webhookId is required" },
        { status: 400 }
      );
    }

    const deleted = deleteWebhook(sessionId, webhookId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Webhook deleted successfully" });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    );
  }
}
