import { NextRequest, NextResponse } from "next/server";
import { deleteWebhookLog } from "@/lib/store";
import { validateApiKey, getAuthErrorResponse } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authentication check
  if (!validateApiKey(request)) {
    return NextResponse.json(getAuthErrorResponse(), { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteWebhookLog(id);
  
  if (deleted) {
    return NextResponse.json({ message: "Log deleted successfully" });
  } else {
    return NextResponse.json({ message: "Log not found" }, { status: 404 });
  }
}
