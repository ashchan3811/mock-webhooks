import { NextRequest, NextResponse } from "next/server";
import { getWebhookLogs, getWebhookLogsPaginated, clearWebhookLogs } from "@/lib/store";
import { validateApiKey, getAuthErrorResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Authentication check
  if (!validateApiKey(request)) {
    return NextResponse.json(getAuthErrorResponse(), { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");
  const usePagination = searchParams.get("paginate") === "true";
  const webhookId = searchParams.get("webhookId") || undefined;

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

    const result = await getWebhookLogsPaginated(page, pageSize, webhookId);
    return NextResponse.json(result);
  }

  // Default: return all logs (for backward compatibility)
  const logs = await getWebhookLogs(webhookId);
  return NextResponse.json({ logs });
}

export async function DELETE(request: NextRequest) {
  // Authentication check
  if (!validateApiKey(request)) {
    return NextResponse.json(getAuthErrorResponse(), { status: 401 });
  }

  await clearWebhookLogs();
  return NextResponse.json({ message: "Logs cleared successfully" });
}
