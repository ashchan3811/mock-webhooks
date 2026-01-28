import { NextRequest, NextResponse } from "next/server";
import { addWebhookLog } from "@/lib/store";

// Constants
const MIN_STATUS_CODE = 100;
const MAX_STATUS_CODE = 599;
const DEFAULT_STATUS_CODE = 200;
const MIN_TIMEOUT_SECONDS = 0;
const MAX_TIMEOUT_SECONDS = 300; // 5 minutes
const DEFAULT_TIMEOUT_SECONDS = 0;
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB

// Type definitions
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface WebhookResponse {
  success: boolean;
  message: string;
  path: string;
  method: HttpMethod;
  statusCode: number;
  timeout: number;
  timestamp: string;
  data: {
    body: any;
  };
  startTime?: string;
  endTime?: string;
  error?: string;
}

// Helper function to validate and parse status code
function validateStatusCode(statusCodeParam: string | null): number {
  if (!statusCodeParam) return DEFAULT_STATUS_CODE;
  
  const parsed = parseInt(statusCodeParam, 10);
  if (isNaN(parsed)) return DEFAULT_STATUS_CODE;
  
  return parsed >= MIN_STATUS_CODE && parsed <= MAX_STATUS_CODE
    ? parsed
    : DEFAULT_STATUS_CODE;
}

// Helper function to validate and parse timeout
function validateTimeout(timeoutParam: string | null): number {
  if (!timeoutParam) return DEFAULT_TIMEOUT_SECONDS;
  
  const parsed = parseInt(timeoutParam, 10);
  if (isNaN(parsed)) return DEFAULT_TIMEOUT_SECONDS;
  
  return parsed >= MIN_TIMEOUT_SECONDS && parsed <= MAX_TIMEOUT_SECONDS
    ? parsed
    : DEFAULT_TIMEOUT_SECONDS;
}

// Helper function to parse request body based on content type
async function parseRequestBody(
  request: NextRequest,
  contentType: string,
): Promise<{ body: any; error?: string }> {
  try {
    // Check content length if available
    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!isNaN(size) && size > MAX_BODY_SIZE) {
        return {
          body: null,
          error: `Body size (${size} bytes) exceeds maximum allowed size (${MAX_BODY_SIZE} bytes)`,
        };
      }
    }

    // Handle form data (must be checked before text() to avoid consuming the stream)
    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      try {
        const formData = await request.formData();
        const entries: Record<string, string | File> = {};
        formData.forEach((value, key) => {
          entries[key] = value instanceof File ? value.name : value;
        });
        return { body: entries };
      } catch (error) {
        return {
          body: null,
          error: `Failed to parse form data: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }

    // For JSON and other content types, read as text first
    const text = await request.text();
    
    // Check size after reading
    if (text.length > MAX_BODY_SIZE) {
      return {
        body: null,
        error: `Body size (${text.length} bytes) exceeds maximum allowed size (${MAX_BODY_SIZE} bytes)`,
      };
    }

    // Parse JSON if content type indicates JSON
    if (contentType.includes("application/json")) {
      if (!text) {
        return { body: null };
      }
      try {
        return { body: JSON.parse(text) };
      } catch (parseError) {
        return {
          body: text,
          error: `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
        };
      }
    }

    // Default: return as text
    return { body: text || null };
  } catch (error) {
    return {
      body: null,
      error: error instanceof Error ? error.message : "Unknown error parsing body",
    };
  }
}

// Helper function to extract headers (excluding x-vercel headers)
function extractHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (!key.toLowerCase().startsWith("x-vercel")) {
      headers[key] = value;
    }
  });
  return headers;
}

// Helper function to extract query parameters
function extractQueryParams(
  searchParams: URLSearchParams,
): Record<string, string> {
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });
  return queryParams;
}

// Helper function to build webhook path
function buildWebhookPath(slug?: string[]): string {
  return slug && slug.length > 0
    ? `/webhooks/${slug.join("/")}`
    : "/webhooks";
}

// Generic handler for all HTTP methods
async function handleRequest(
  request: NextRequest,
  method: HttpMethod,
  slug?: string[],
): Promise<NextResponse<WebhookResponse>> {
  return handleWebhook(request, method, slug);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return handleRequest(request, "GET", slug);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return handleRequest(request, "POST", slug);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return handleRequest(request, "PUT", slug);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return handleRequest(request, "PATCH", slug);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return handleRequest(request, "DELETE", slug);
}

async function handleWebhook(
  request: NextRequest,
  method: HttpMethod,
  slug?: string[],
): Promise<NextResponse<WebhookResponse>> {
  try {
    const path = buildWebhookPath(slug);
    const searchParams = request.nextUrl.searchParams;
    const queryParams = extractQueryParams(searchParams);

    // Parse and validate status code and timeout
    const statusCode = validateStatusCode(searchParams.get("statusCode"));
    const timeoutSeconds = validateTimeout(searchParams.get("timeout"));
    const timeoutMs = timeoutSeconds * 1000;

    // Track start and end time for timeout
    let startTime: string | undefined;
    let endTime: string | undefined;

    // Wait for the specified timeout if needed
    if (timeoutMs > 0) {
      startTime = new Date().toISOString();
      console.log(
        `[Webhook] Waiting ${timeoutSeconds}s (${timeoutMs}ms) before responding...`,
      );
      await new Promise((resolve) => setTimeout(resolve, timeoutMs));
      endTime = new Date().toISOString();
      console.log(`[Webhook] Wait completed at ${endTime}`);
    }

    // Extract headers and body
    const headers = extractHeaders(request);
    const contentType = request.headers.get("content-type") || "";
    const { body, error: bodyError } = await parseRequestBody(
      request,
      contentType,
    );

    const timestamp = new Date().toISOString();

    // Log webhook data
    console.log("=== Webhook Received ===");
    console.log("Path:", path);
    console.log("Method:", method);
    console.log("URL:", request.url);
    console.log("Status Code:", statusCode);
    console.log("Timeout (seconds):", timeoutSeconds);
    if (bodyError) {
      console.warn("Body parsing warning:", bodyError);
    }
    console.log("Headers:", headers);
    console.log("Query Params:", queryParams);
    console.log("Body:", body);
    console.log("=======================");

    // Save webhook log
    const logId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    addWebhookLog({
      id: logId,
      timestamp,
      method,
      path,
      url: request.url,
      statusCode,
      timeout: timeoutSeconds > 0 ? timeoutSeconds : undefined,
      startTime,
      endTime,
      headers,
      queryParams,
      body,
    });

    // Build response
    const response: WebhookResponse = {
      success: true,
      message: "Webhook received successfully",
      path,
      method,
      statusCode,
      timeout: timeoutSeconds,
      timestamp,
      data: {
        body,
      },
    };

    // Add timing information if timeout was used
    if (timeoutSeconds > 0 && startTime && endTime) {
      response.startTime = startTime;
      response.endTime = endTime;
    }

    // Add body parsing error to response if present
    if (bodyError) {
      response.message = `Webhook received with body parsing warning: ${bodyError}`;
    }

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Webhook] Error processing webhook:", errorMessage, error);

    const errorResponse: WebhookResponse = {
      success: false,
      message: "Error processing webhook",
      path: buildWebhookPath(slug),
      method,
      statusCode: 500,
      timeout: 0,
      timestamp: new Date().toISOString(),
      data: {
        body: null,
      },
      error: errorMessage,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
