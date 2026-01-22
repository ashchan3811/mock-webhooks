import { NextRequest, NextResponse } from "next/server";
import { addWebhookLog } from "@/lib/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return handleWebhook(request, "GET", slug);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return handleWebhook(request, "POST", slug);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return handleWebhook(request, "PUT", slug);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return handleWebhook(request, "PATCH", slug);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return handleWebhook(request, "DELETE", slug);
}

async function handleWebhook(
  request: NextRequest,
  method: string,
  slug?: string[],
) {
  try {
    // Get the path from slug, prepend /webhooks
    const path = slug && slug.length > 0 
      ? `/webhooks/${slug.join("/")}` 
      : "/webhooks";

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Parse statusCode and timeout from query params
    const statusCodeParam = searchParams.get("statusCode");
    const timeoutParam = searchParams.get("timeout");
    
    const statusCode = statusCodeParam ? parseInt(statusCodeParam, 10) : 200;
    const timeoutSeconds = timeoutParam ? parseInt(timeoutParam, 10) : 0;

    // Validate status code (must be between 100 and 599)
    const validStatusCode = statusCode >= 100 && statusCode <= 599 ? statusCode : 200;
    
    // Validate timeout in seconds (must be non-negative, cap at reasonable limit like 300 seconds = 5 minutes)
    const validTimeoutSeconds = timeoutSeconds >= 0 && timeoutSeconds <= 300 ? timeoutSeconds : 0;
    
    // Convert seconds to milliseconds for setTimeout
    const validTimeoutMs = validTimeoutSeconds * 1000;

    // Track start and end time for timeout
    let startTime: string | undefined;
    let endTime: string | undefined;

    // Wait for the specified timeout (timeout is in seconds, converted to milliseconds)
    if (validTimeoutMs > 0) {
      startTime = new Date().toISOString();
      console.log(`Waiting ${validTimeoutSeconds} seconds (${validTimeoutMs}ms) before responding...`);
      console.log(`Start time: ${startTime}`);
      await new Promise((resolve) => setTimeout(resolve, validTimeoutMs));
      endTime = new Date().toISOString();
      console.log(`End time: ${endTime}`);
      console.log(`Wait completed`);
    }

    // Get headers (excluding x-vercel headers)
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (!key.toLowerCase().startsWith("x-vercel")) {
        headers[key] = value;
      }
    });

    // Get body based on content type
    let body: any = null;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        body = await request.json();
      } catch {
        body = null;
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      try {
        const formData = await request.formData();
        body = Object.fromEntries(formData.entries());
      } catch {
        body = null;
      }
    } else if (contentType.includes("multipart/form-data")) {
      try {
        const formData = await request.formData();
        body = Object.fromEntries(formData.entries());
      } catch {
        body = null;
      }
    } else {
      try {
        body = await request.text();
      } catch {
        body = null;
      }
    }

    const timestamp = new Date().toISOString();

    // Log webhook data (in production, you might want to save this to a database)
    console.log("=== Webhook Received ===");
    console.log("Path:", path);
    console.log("Method:", method);
    console.log("URL:", request.url);
    console.log("Status Code:", validStatusCode);
    console.log("Timeout (seconds):", validTimeoutSeconds);
    console.log("Headers:", headers);
    console.log("Query Params:", queryParams);
    console.log("Body:", body);
    console.log("=======================");

    // Save webhook log
    const logId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    addWebhookLog({
      id: logId,
      timestamp,
      method,
      path,
      url: request.url,
      statusCode: validStatusCode,
      timeout: validTimeoutSeconds > 0 ? validTimeoutSeconds : undefined,
      startTime,
      endTime,
      headers,
      queryParams,
      body,
    });

    const response: any = {
      success: true,
      message: "Webhook received successfully",
      path,
      method,
      statusCode: validStatusCode,
      timeout: validTimeoutSeconds,
      timestamp,
      data: {
        body,
      },
    };

    // Add startTime and endTime if timeout was used
    if (validTimeoutSeconds > 0 && startTime && endTime) {
      response.startTime = startTime;
      response.endTime = endTime;
    }

    return NextResponse.json(response, { status: validStatusCode });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error processing webhook",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
