"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useCloudSignal } from "./use-cloudsignal";
import { topics } from "@/lib/constants";
import type {
  ChatMessage,
  MqttCredentials,
  TokenMessage,
  StreamStatusMessage,
  CompleteMessage,
} from "@/lib/types";

interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const streamBufferRef = useRef<string>("");
  const currentMessageIdRef = useRef<string | null>(null);
  const credentialsRef = useRef<MqttCredentials | null>(null);

  const wssUrl = process.env.NEXT_PUBLIC_CLOUDSIGNAL_WSS_URL || "";

  const handleMqttMessage = useCallback((topic: string, payload: unknown) => {
    const data = payload as Record<string, unknown>;

    // Token stream — append to current streaming message
    if (topic === topics.response(sessionId) && data.type === "token") {
      const token = data as unknown as TokenMessage;
      streamBufferRef.current += token.content;

      setChatMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].isStreaming) {
          updated[lastIdx] = { ...updated[lastIdx], content: streamBufferRef.current };
        }
        return updated;
      });
    }

    // Stream status events
    if (topic === topics.status(sessionId)) {
      const status = data as unknown as StreamStatusMessage;

      if (status.type === "stream_start") {
        streamBufferRef.current = "";
        currentMessageIdRef.current = status.messageId;
        setIsStreaming(true);

        // Add placeholder streaming message
        setChatMessages((prev) => [
          ...prev,
          {
            id: status.messageId,
            role: "assistant",
            content: "",
            timestamp: status.timestamp,
            isStreaming: true,
          },
        ]);
      }

      if (status.type === "stream_end") {
        setIsStreaming(false);
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === currentMessageIdRef.current ? { ...m, isStreaming: false } : m
          )
        );
        currentMessageIdRef.current = null;
      }

      if (status.type === "error") {
        setIsStreaming(false);
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === currentMessageIdRef.current
              ? { ...m, content: `Error: ${status.message}`, isStreaming: false }
              : m
          )
        );
        currentMessageIdRef.current = null;
      }
    }

    // Complete message (retained) — handles offline recovery
    if (topic === topics.complete(sessionId)) {
      const complete = data as unknown as CompleteMessage;

      setChatMessages((prev) => {
        // If we already have this message (from streaming), update it
        const existing = prev.find((m) => m.id === complete.messageId);
        if (existing) {
          return prev.map((m) =>
            m.id === complete.messageId
              ? { ...m, content: complete.content, isStreaming: false }
              : m
          );
        }
        // If we don't have it (offline recovery), add it
        return [
          ...prev,
          {
            id: complete.messageId,
            role: "assistant",
            content: complete.content,
            timestamp: complete.timestamp,
            isStreaming: false,
          },
        ];
      });
    }
  }, [sessionId]);

  const {
    isConnected,
    isConnecting,
    error,
    connect,
    subscribe,
  } = useCloudSignal({
    onMessage: handleMqttMessage,
  });

  // Connect and subscribe on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Fetch MQTT credentials from our API route
        const res = await fetch("/api/auth/mqtt", { method: "POST" });
        if (!res.ok) throw new Error("Failed to get MQTT credentials");
        const creds: MqttCredentials = await res.json();
        credentialsRef.current = creds;

        if (!mounted) return;

        // Connect via WSS with credentials
        await connect({
          host: wssUrl,
          username: creds.username,
          password: creds.password,
        });

        if (!mounted) return;

        // Subscribe to all session topics
        await subscribe(topics.all(sessionId), 1);
      } catch (err) {
        console.error("[useChat] Init failed:", err);
      }
    }

    init();
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Add user message to UI immediately
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, userMsg]);

      // Send to API route (which triggers Claude streaming via MQTT)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: content.trim() }),
      });

      if (!res.ok) {
        setChatMessages((prev) =>
          prev.filter((m) => m.id !== userMsg.id)
        );
      }
    },
    [sessionId]
  );

  return {
    messages: chatMessages,
    isStreaming,
    isConnected,
    isConnecting,
    error,
    sendMessage,
  };
}
