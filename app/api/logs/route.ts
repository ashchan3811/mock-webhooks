import { NextRequest, NextResponse } from "next/server";
import { getWebhookLogs, getWebhookLogsPaginated, clearWebhookLogs } from "@/lib/store";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");
  const usePagination = searchParams.get("paginate") === "true";

  // If pagination is requested, return paginated results
  if (usePagination) {
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const pageSize = pageSizeParam
      ? Math.min(parseInt(pageSizeParam, 10), 100) // Max 100 per page
      : 50;

    if (isNaN(page) || page < 1 || isNaN(pageSize) || pageSize < 1) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    const result = getWebhookLogsPaginated(page, pageSize);
    return NextResponse.json(result);
  }

  // Default: return all logs (for backward compatibility)
  const logs = getWebhookLogs();
  return NextResponse.json({ logs });
}

export async function DELETE() {
  clearWebhookLogs();
  return NextResponse.json({ message: "Logs cleared successfully" });
}
