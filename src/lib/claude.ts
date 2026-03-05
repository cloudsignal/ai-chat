import Anthropic from "@anthropic-ai/sdk";
import { publishMessage } from "./mqtt-server";
import { topics } from "./constants";
import type { TokenMessage, StreamStartMessage, StreamEndMessage, StreamErrorMessage, CompleteMessage } from "./types";

const anthropic = new Anthropic();

/**
 * Stream a Claude response and publish each token to MQTT.
 *
 * - Tokens published to response topic (QoS 0, not retained)
 * - Status events published to status topic (QoS 1, retained)
 * - Full assembled response published to complete topic (QoS 1, retained)
 *
 * Returns the full response content for conversation history.
 */
export async function streamChatResponse(
  sessionId: string,
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const messageId = `msg_${crypto.randomUUID().slice(0, 12)}`;
  const model = "claude-sonnet-4-20250514";

  // Publish stream_start (QoS 1, retained)
  const startMsg: StreamStartMessage = {
    type: "stream_start",
    messageId,
    model,
    timestamp: Date.now(),
  };
  await publishMessage(topics.status(sessionId), startMsg, { qos: 1, retain: true });

  let fullContent = "";
  let tokenIndex = 0;

  try {
    const stream = anthropic.messages.stream({
      model,
      max_tokens: 4096,
      messages: [
        ...conversationHistory,
        { role: "user", content: userMessage },
      ],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const text = event.delta.text;
        fullContent += text;

        // Publish token (QoS 0, not retained)
        const tokenMsg: TokenMessage = {
          type: "token",
          content: text,
          index: tokenIndex++,
          timestamp: Date.now(),
        };
        await publishMessage(topics.response(sessionId), tokenMsg, { qos: 0, retain: false });
      }
    }

    const finalMessage = await stream.finalMessage();

    // Publish complete response (QoS 1, retained)
    const completeMsg: CompleteMessage = {
      type: "complete",
      messageId,
      content: fullContent,
      model,
      timestamp: Date.now(),
    };
    await publishMessage(topics.complete(sessionId), completeMsg, { qos: 1, retain: true });

    // Publish stream_end (QoS 1, retained)
    const endMsg: StreamEndMessage = {
      type: "stream_end",
      messageId,
      usage: {
        input_tokens: finalMessage.usage.input_tokens,
        output_tokens: finalMessage.usage.output_tokens,
      },
      timestamp: Date.now(),
    };
    await publishMessage(topics.status(sessionId), endMsg, { qos: 1, retain: true });

    return fullContent;
  } catch (err) {
    const errorMsg: StreamErrorMessage = {
      type: "error",
      message: err instanceof Error ? err.message : "Unknown error",
      retryable: err instanceof Anthropic.RateLimitError,
      timestamp: Date.now(),
    };
    await publishMessage(topics.status(sessionId), errorMsg, { qos: 1, retain: true });
    throw err;
  }
}
