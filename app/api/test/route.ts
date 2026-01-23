import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, getAuthErrorResponse } from "@/lib/auth";
import { getWebhookLogById } from "@/lib/store";

/**
 * Webhook testing and validation tools
 */

export async function POST(request: NextRequest) {
  // Authentication check
  if (!validateApiKey(request)) {
    return NextResponse.json(getAuthErrorResponse(), { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "replay": {
        const { logId, targetUrl } = params;
        if (!logId) {
          return NextResponse.json(
            { error: "logId is required for replay action" },
            { status: 400 }
          );
        }

        const log = await getWebhookLogById(logId);
        if (!log) {
          return NextResponse.json(
            { error: "Log not found" },
            { status: 404 }
          );
        }

        // Replay the webhook to target URL
        try {
          const replayResponse = await fetch(targetUrl || log.url, {
            method: log.method,
            headers: {
              "Content-Type": "application/json",
              ...log.headers,
            },
            body: log.body ? JSON.stringify(log.body) : undefined,
          });

          const responseText = await replayResponse.text();
          let responseBody;
          try {
            responseBody = JSON.parse(responseText);
          } catch {
            responseBody = responseText;
          }

          return NextResponse.json({
            success: true,
            action: "replay",
            originalLog: {
              id: log.id,
              method: log.method,
              path: log.path,
              timestamp: log.timestamp,
            },
            replay: {
              status: replayResponse.status,
              statusText: replayResponse.statusText,
              headers: Object.fromEntries(replayResponse.headers.entries()),
              body: responseBody,
            },
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: "Failed to replay webhook",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      }

      case "validate": {
        const { schema, data } = params;
        if (!schema || !data) {
          return NextResponse.json(
            { error: "schema and data are required for validate action" },
            { status: 400 }
          );
        }

        // Basic JSON schema validation
        const validationResult = validateJsonSchema(schema, data);
        return NextResponse.json({
          success: validationResult.valid,
          action: "validate",
          validation: validationResult,
        });
      }

      case "compare": {
        const { logId1, logId2 } = params;
        if (!logId1 || !logId2) {
          return NextResponse.json(
            { error: "logId1 and logId2 are required for compare action" },
            { status: 400 }
          );
        }

        const log1 = await getWebhookLogById(logId1);
        const log2 = await getWebhookLogById(logId2);

        if (!log1 || !log2) {
          return NextResponse.json(
            { error: "One or both logs not found" },
            { status: 404 }
          );
        }

        const differences = compareLogs(log1, log2);
        return NextResponse.json({
          success: true,
          action: "compare",
          differences,
          logs: {
            log1: { id: log1.id, timestamp: log1.timestamp },
            log2: { id: log2.id, timestamp: log2.timestamp },
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Supported actions: replay, validate, compare` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in test endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to process test request",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Basic JSON schema validation
 */
function validateJsonSchema(schema: any, data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (schema.type) {
    if (schema.type === "object" && typeof data !== "object" || Array.isArray(data)) {
      errors.push(`Expected object, got ${typeof data}`);
    } else if (schema.type === "array" && !Array.isArray(data)) {
      errors.push(`Expected array, got ${typeof data}`);
    } else if (schema.type === "string" && typeof data !== "string") {
      errors.push(`Expected string, got ${typeof data}`);
    } else if (schema.type === "number" && typeof data !== "number") {
      errors.push(`Expected number, got ${typeof data}`);
    } else if (schema.type === "boolean" && typeof data !== "boolean") {
      errors.push(`Expected boolean, got ${typeof data}`);
    }
  }

  if (schema.required && Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  if (schema.properties && typeof data === "object" && !Array.isArray(data)) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in data) {
        const nestedResult = validateJsonSchema(propSchema as any, data[key]);
        if (!nestedResult.valid) {
          errors.push(`Field '${key}': ${nestedResult.errors.join(", ")}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Compare two webhook logs
 */
function compareLogs(log1: any, log2: any): {
  method: { same: boolean; values: { log1: string; log2: string } };
  statusCode: { same: boolean; values: { log1: number; log2: number } };
  path: { same: boolean; values: { log1: string; log2: string } };
  body: { same: boolean; differences: string[] };
  headers: { same: boolean; differences: string[] };
} {
  const bodySame = JSON.stringify(log1.body) === JSON.stringify(log2.body);
  const bodyDifferences: string[] = [];
  if (!bodySame) {
    bodyDifferences.push("Body content differs");
  }

  const headerDifferences: string[] = [];
  const allHeaderKeys = new Set([
    ...Object.keys(log1.headers),
    ...Object.keys(log2.headers),
  ]);
  for (const key of allHeaderKeys) {
    if (log1.headers[key] !== log2.headers[key]) {
      headerDifferences.push(`Header '${key}' differs`);
    }
  }

  return {
    method: {
      same: log1.method === log2.method,
      values: { log1: log1.method, log2: log2.method },
    },
    statusCode: {
      same: log1.statusCode === log2.statusCode,
      values: { log1: log1.statusCode, log2: log2.statusCode },
    },
    path: {
      same: log1.path === log2.path,
      values: { log1: log1.path, log2: log2.path },
    },
    body: {
      same: bodySame,
      differences: bodyDifferences,
    },
    headers: {
      same: headerDifferences.length === 0,
      differences: headerDifferences,
    },
  };
}
