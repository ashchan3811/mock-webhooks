import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";

export async function POST() {
  try {
    const sessionId = await getSessionId();
    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error("Error initializing session:", error);
    return NextResponse.json(
      { error: "Failed to initialize session" },
      { status: 500 }
    );
  }
}
