// ============================================================================
// MQTT Message Types — sent/received over CloudSignal topics
// ============================================================================

/** Individual token from Claude stream (QoS 0, not retained) */
export interface TokenMessage {
  type: "token";
  content: string;
  index: number;
  timestamp: number;
}

/** Stream lifecycle event (QoS 1, retained) */
export interface StreamStartMessage {
  type: "stream_start";
  messageId: string;
  model: string;
  timestamp: number;
}

export interface StreamEndMessage {
  type: "stream_end";
  messageId: string;
  usage: { input_tokens: number; output_tokens: number };
  timestamp: number;
}

export interface StreamErrorMessage {
  type: "error";
  message: string;
  retryable: boolean;
  timestamp: number;
}

export type StreamStatusMessage = StreamStartMessage | StreamEndMessage | StreamErrorMessage;

/** Full assembled response (QoS 1, retained) */
export interface CompleteMessage {
  type: "complete";
  messageId: string;
  content: string;
  model: string;
  timestamp: number;
}

/** User message sent to API (HTTP POST body) */
export interface ChatRequest {
  sessionId: string;
  message: string;
}

/** Token auth credentials returned to client */
export interface MqttCredentials {
  username: string;
  password: string;
  orgShortId: string;
  expiresAt: string;
  refreshRecommendedAt: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}
