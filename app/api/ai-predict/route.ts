import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { REQUEST_TYPE_KEYWORDS } from "@/lib/constant";

const FALLBACK_RT = "TBD by Facilities Expert";
const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;

const REQUEST_TYPES = REQUEST_TYPE_KEYWORDS.map((r) => r.rt);

/**
 * Returns matched request types ranked by keyword hit count.
 * Each match also carries a raw score (hits / total keywords) used to
 * nudge the confidence value toward something believable.
 */
function fuzzyMatch(description: string): { rt: string; score: number }[] {
  const normalized = description.toLowerCase();
  const scores = REQUEST_TYPE_KEYWORDS.map(({ rt, keywords }) => {
    // Sort keywords longest-first so more specific phrases score higher than
    // their component words when both appear in the description.
    const sorted = [...keywords].sort((a, b) => b.length - a.length);
    let hits = 0;
    let remaining = normalized;
    for (const kw of sorted) {
      if (remaining.includes(kw)) {
        // Weight longer/more-specific keywords more heavily
        hits += kw.split(" ").length;
        // Consume matched text so a phrase doesn't double-count its words
        remaining = remaining.replace(kw, "");
      }
    }
    return { rt, score: hits };
  }).filter((r) => r.score > 0);

  return scores.sort((a, b) => b.score - a.score);
}

interface AiPredictRequest {
  problem_description?: string;
  confidence_threshold?: number;
}

function randomFloat(min: number, max: number, decimals = 5): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const PROCESSING_DELAY_MS = { min: 1000, max: 10000 };
const TIMEOUT_DELAY_MS = 29000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function newRequestId(): string {
  return randomUUID().replace(/-/g, "").substring(0, 32);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: AiPredictRequest = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const threshold =
    typeof body.confidence_threshold === "number" &&
    body.confidence_threshold > 0 &&
    body.confidence_threshold < 1
      ? body.confidence_threshold
      : DEFAULT_CONFIDENCE_THRESHOLD;

  const roll = Math.random();

  // Resolve predicted RT and confidence nudge from description (if provided)
  const matches = body.problem_description
    ? fuzzyMatch(body.problem_description)
    : [];
  const topMatch = matches[0];
  const predictedRt = topMatch ? topMatch.rt : pickRandom(REQUEST_TYPES);

  // Comma-separated description → always return multiple_rts
  const segments = body.problem_description
    ? body.problem_description
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (segments.length >= 2) {
    const segmentRts: string[] = [];
    for (const segment of segments) {
      const segMatches = fuzzyMatch(segment);
      if (segMatches.length > 0) {
        const rt = segMatches[0].rt;
        if (!segmentRts.includes(rt)) segmentRts.push(rt);
      }
    }

    // Ensure at least 2 distinct RTs to show in the message
    let detected: string[];
    if (segmentRts.length >= 2) {
      detected = segmentRts;
    } else if (matches.length >= 2) {
      detected = [matches[0].rt, matches[1].rt];
    } else {
      const fallback = pickRandom(
        REQUEST_TYPES.filter((r) => r !== (segmentRts[0] ?? ""))
      );
      detected = [segmentRts[0] ?? pickRandom(REQUEST_TYPES), fallback];
    }

    const processingDelay = randomFloat(
      PROCESSING_DELAY_MS.min,
      PROCESSING_DELAY_MS.max,
      0
    );
    await sleep(processingDelay);

    return NextResponse.json(
      {
        status: "multiple_rts",
        predicted_rt: FALLBACK_RT,
        request_id: newRequestId(),
        message: `Multiple request types detected: ${detected.join(
          ", "
        )}. Only one issue can be submitted per request`,
        error_code: "MULTIPLE_RTS",
      },
      { status: 422 }
    );
  }

  // Description contains "timeout" → always return timeout
  if (body.problem_description?.toLowerCase().includes("timeout")) {
    await sleep(TIMEOUT_DELAY_MS);
    return NextResponse.json(
      {
        status: "timeout",
        predicted_rt: FALLBACK_RT,
        request_id: newRequestId(),
        message:
          "AI Model timed out before a Request Type could be predicted. Defaulting to fallback Request Type",
        error_code: "TIMEOUT",
      },
      { status: 504 }
    );
  }

  // Timeout scenario: wait 29s then respond
  if (roll >= 0.9 && roll < 0.97) {
    await sleep(TIMEOUT_DELAY_MS);
    return NextResponse.json(
      {
        status: "timeout",
        predicted_rt: FALLBACK_RT,
        request_id: newRequestId(),
        message:
          "AI Model timed out before a Request Type could be predicted. Defaulting to fallback Request Type",
        error_code: "TIMEOUT",
      },
      { status: 504 }
    );
  }

  // All other scenarios: simulate real AI processing delay (5–10s)
  const processingDelay = randomFloat(
    PROCESSING_DELAY_MS.min,
    PROCESSING_DELAY_MS.max,
    0
  );
  await sleep(processingDelay);

  // 55% success
  if (roll < 0.55) {
    // Nudge confidence higher when description strongly matched
    const confidenceMin = topMatch
      ? Math.min(threshold + topMatch.score * (0.99 - threshold), 0.98)
      : threshold;
    return NextResponse.json({
      status: "success",
      predicted_rt: predictedRt,
      confidence: randomFloat(confidenceMin, 0.99),
      request_id: newRequestId(),
    });
  }

  // 20% low_confidence
  if (roll < 0.75) {
    const confidence = randomFloat(0.01, threshold - 0.001);
    return NextResponse.json(
      {
        status: "low_confidence",
        predicted_rt: predictedRt,
        confidence,
        request_id: newRequestId(),
        message: `Confidence ${(confidence * 100).toFixed(
          1
        )}% is below threshold ${(threshold * 100).toFixed(
          0
        )}%. Human review required`,
        error_code: "LOW_CONFIDENCE",
      },
      { status: 422 }
    );
  }

  // 15% multiple_rts — use top two fuzzy matches if available, else random
  if (roll < 0.9) {
    const detected =
      matches.length >= 2
        ? [matches[0].rt, matches[1].rt]
        : Array.from(
            new Set([pickRandom(REQUEST_TYPES), pickRandom(REQUEST_TYPES)])
          );
    return NextResponse.json(
      {
        status: "multiple_rts",
        predicted_rt: FALLBACK_RT,
        request_id: newRequestId(),
        message: `Multiple request types detected: ${detected.join(
          ", "
        )}. Only one issue can be submitted per request`,
        error_code: "MULTIPLE_RTS",
      },
      { status: 422 }
    );
  }

  // 3% network_error
  return NextResponse.json(
    { error: "Network error: Unable to connect to AI service" },
    { status: 503 }
  );
}
