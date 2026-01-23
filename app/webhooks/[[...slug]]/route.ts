import { NextRequest, NextResponse } from "next/server";
import { addWebhookLog } from "@/lib/store";
import {
  checkRateLimit,
  getClientIP,
  canStartTimeoutRequest,
  startTimeoutRequest,
  endTimeoutRequest,
  validatePayloadSize,
  getContentLength,
  SECURITY_CONFIG,
} from "@/lib/security";
import { validateApiKey, getAuthErrorResponse } from "@/lib/auth";
import { extractWebhookIdFromPath } from "@/lib/webhooks";

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
    // Authentication check
    if (!validateApiKey(request)) {
      return NextResponse.json(getAuthErrorResponse(), { status: 401 });
    }

    // Rate limiting check
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Rate limit exceeded",
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": SECURITY_CONFIG.RATE_LIMIT_REQUESTS.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    // Check payload size before processing
    const contentLength = getContentLength(request);
    if (contentLength !== null && !validatePayloadSize(contentLength)) {
      return NextResponse.json(
        {
          success: false,
          message: "Payload too large",
          error: `Request body exceeds maximum size of ${SECURITY_CONFIG.MAX_BODY_SIZE} bytes`,
          maxSize: SECURITY_CONFIG.MAX_BODY_SIZE,
        },
        { status: 413 }
      );
    }

    // Get the path from slug, prepend /webhooks
    const path = slug && slug.length > 0 
      ? `/webhooks/${slug.join("/")}` 
      : "/webhooks";

    // Extract webhook_id from path if present
    const webhookId = extractWebhookIdFromPath(path);

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
    
    // Validate timeout in seconds (must be non-negative, cap at security limit)
    const validTimeoutSeconds = timeoutSeconds >= 0 && timeoutSeconds <= SECURITY_CONFIG.MAX_TIMEOUT_SECONDS 
      ? timeoutSeconds 
      : 0;
    
    // Check if we can handle a timeout request (prevent resource exhaustion)
    if (validTimeoutSeconds > 0 && !canStartTimeoutRequest()) {
      return NextResponse.json(
        {
          success: false,
          message: "Service temporarily unavailable",
          error: "Too many concurrent requests with timeouts. Please try again later.",
        },
        { status: 503 }
      );
    }
    
    // Convert seconds to milliseconds for setTimeout
    const validTimeoutMs = validTimeoutSeconds * 1000;

    // Track start and end time for timeout
    let startTime: string | undefined;
    let endTime: string | undefined;

    // Wait for the specified timeout (timeout is in seconds, converted to milliseconds)
    if (validTimeoutMs > 0) {
      startTimeoutRequest();
      try {
        startTime = new Date().toISOString();
        await new Promise((resolve) => setTimeout(resolve, validTimeoutMs));
        endTime = new Date().toISOString();
      } finally {
        endTimeoutRequest();
      }
    }

    // Get headers (excluding x-vercel headers)
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (!key.toLowerCase().startsWith("x-vercel")) {
        headers[key] = value;
      }
    });

    // Get body based on content type with size validation
    let body: any = null;
    const contentType = request.headers.get("content-type") || "";

    try {
      if (contentType.includes("application/json")) {
        // For JSON, read as text first to check size, then parse
        const text = await request.text();
        if (!validatePayloadSize(text.length, SECURITY_CONFIG.MAX_JSON_SIZE)) {
          return NextResponse.json(
            {
              success: false,
              message: "Payload too large",
              error: `JSON body exceeds maximum size of ${SECURITY_CONFIG.MAX_JSON_SIZE} bytes`,
              maxSize: SECURITY_CONFIG.MAX_JSON_SIZE,
            },
            { status: 413 }
          );
        }
        try {
          body = JSON.parse(text);
        } catch {
          body = null;
        }
      } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        // Estimate form data size (rough approximation)
        let estimatedSize = 0;
        for (const [key, value] of formData.entries()) {
          estimatedSize += key.length;
          if (value instanceof File) {
            estimatedSize += value.size;
          } else {
            estimatedSize += value.toString().length;
          }
        }
        if (!validatePayloadSize(estimatedSize, SECURITY_CONFIG.MAX_BODY_SIZE)) {
          return NextResponse.json(
            {
              success: false,
              message: "Payload too large",
              error: `Form data exceeds maximum size of ${SECURITY_CONFIG.MAX_BODY_SIZE} bytes`,
              maxSize: SECURITY_CONFIG.MAX_BODY_SIZE,
            },
            { status: 413 }
          );
        }
        body = Object.fromEntries(formData.entries());
      } else {
        const text = await request.text();
        if (!validatePayloadSize(text.length, SECURITY_CONFIG.MAX_TEXT_SIZE)) {
          return NextResponse.json(
            {
              success: false,
              message: "Payload too large",
              error: `Text body exceeds maximum size of ${SECURITY_CONFIG.MAX_TEXT_SIZE} bytes`,
              maxSize: SECURITY_CONFIG.MAX_TEXT_SIZE,
            },
            { status: 413 }
          );
        }
        body = text;
      }
    } catch (error) {
      // If body parsing fails, log but don't fail the request
      console.error("Error parsing request body:", error);
      body = null;
    }

    const timestamp = new Date().toISOString();

    // Save webhook log
    const logId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await addWebhookLog({
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
      webhookId: webhookId || undefined,
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

    // Add rate limit headers to response
    const responseHeaders: Record<string, string> = {
      "X-RateLimit-Limit": SECURITY_CONFIG.RATE_LIMIT_REQUESTS.toString(),
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      "X-RateLimit-Reset": new Date(rateLimitResult.resetTime).toISOString(),
    };

    return NextResponse.json(response, {
      status: validStatusCode,
      headers: responseHeaders,
    });
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
