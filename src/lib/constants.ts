/** Build MQTT topic paths for a chat session */
export const topics = {
  /** User messages — published by client */
  messages: (sessionId: string) => `chat/${sessionId}/messages`,
  /** AI token stream — published by server (QoS 0) */
  response: (sessionId: string) => `chat/${sessionId}/response`,
  /** Stream lifecycle events — published by server (QoS 1, retained) */
  status: (sessionId: string) => `chat/${sessionId}/response/status`,
  /** Full assembled response — published by server (QoS 1, retained) */
  complete: (sessionId: string) => `chat/${sessionId}/response/complete`,
  /** Typing indicators (QoS 0) */
  typing: (sessionId: string) => `chat/${sessionId}/typing`,
  /** Session metadata (QoS 1, retained) */
  metadata: (sessionId: string) => `chat/${sessionId}/metadata`,
  /** Wildcard subscription for a session */
  all: (sessionId: string) => `chat/${sessionId}/#`,
} as const;
