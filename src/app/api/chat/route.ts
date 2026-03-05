import { NextRequest, NextResponse } from "next/server";
import { streamChatResponse } from "@/lib/claude";
import type { ChatRequest } from "@/lib/types";

// In-memory conversation history per session (production would use a database)
const sessionHistory = new Map<string, Array<{ role: "user" | "assistant"; content: string }>>();
const sessionLocks = new Map<string, Promise<void>>();

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ChatRequest;
  const { sessionId, message } = body;

  if (!sessionId || typeof sessionId !== "string" || sessionId.length > 100) {
    return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
  }
  if (!message || typeof message !== "string" || message.length > 50000) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  // Get or create conversation history
  if (!sessionHistory.has(sessionId)) {
    sessionHistory.set(sessionId, []);
  }
  const history = sessionHistory.get(sessionId)!;

  // Add user message to history
  history.push({ role: "user", content: message });

  // Serialize concurrent requests per session to prevent history race conditions
  const prevLock = sessionLocks.get(sessionId) ?? Promise.resolve();
  const currentLock = prevLock.then(async () => {
    const assistantContent = await streamChatResponse(sessionId, message, history);
    history.push({ role: "assistant", content: assistantContent });
  }).catch((err) => {
    console.error(`[chat] Stream error for session ${sessionId}:`, err);
  });
  sessionLocks.set(sessionId, currentLock);

  return NextResponse.json({ status: "streaming", sessionId }, { status: 202 });
}
