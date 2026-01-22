import { NextRequest, NextResponse } from "next/server";
import { deleteWebhookLog } from "@/lib/store";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteWebhookLog(id);
  
  if (deleted) {
    return NextResponse.json({ message: "Log deleted successfully" });
  } else {
    return NextResponse.json({ message: "Log not found" }, { status: 404 });
  }
}
