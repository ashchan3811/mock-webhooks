import { NextResponse } from "next/server";
import { getWebhookLogs, clearWebhookLogs } from "@/lib/store";

export async function GET() {
  const logs = getWebhookLogs();
  return NextResponse.json({ logs });
}

export async function DELETE() {
  clearWebhookLogs();
  return NextResponse.json({ message: "Logs cleared successfully" });
}
