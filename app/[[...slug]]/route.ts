import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const path = slug && slug.length > 0 ? `/${slug.join("/")}` : "/";
  
  return NextResponse.json({ 
    message: "Webhook endpoint is ready!",
    path,
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    usage: "Send webhook requests to this endpoint"
  });
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
    // Get the path from slug
    const path = slug && slug.length > 0 ? `/${slug.join("/")}` : "/";

    // Get headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
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

    // Log webhook data (in production, you might want to save this to a database)
    console.log("=== Webhook Received ===");
    console.log("Path:", path);
    console.log("Method:", method);
    console.log("URL:", request.url);
    console.log("Headers:", headers);
    console.log("Query Params:", queryParams);
    console.log("Body:", body);
    console.log("=======================");

    return NextResponse.json(
      {
        success: true,
        message: "Webhook received successfully",
        path,
        method,
        timestamp: new Date().toISOString(),
        data: {
          body,
        },
      },
      { status: 200 }
    );
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
