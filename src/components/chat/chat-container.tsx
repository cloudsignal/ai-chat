'use client';

import { useChat } from '@ai-sdk/react';
import { CloudSignalChatTransport } from '@cloudsignal/ai-transport';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';

// The drop-in transport — this is the only line that differs from a standard AI SDK app
const transport = new CloudSignalChatTransport({
  api: '/api/chat',
  authEndpoint: '/api/auth/mqtt',
  wssUrl: process.env.NEXT_PUBLIC_CLOUDSIGNAL_WSS_URL,
});

export function ChatContainer() {
  const { messages, sendMessage, status, error } = useChat({ transport });

  const isLoading = status === 'streaming' || status === 'submitted';

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            CloudSignal AI Chat
          </h1>
          <p className="text-xs text-gray-500">
            Powered by Claude via MQTT — drop-in Vercel AI SDK transport
          </p>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-800 px-4 py-2">
          <p className="text-sm text-red-600 dark:text-red-400 max-w-3xl mx-auto">
            {error.message}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-hidden max-w-3xl mx-auto w-full flex flex-col">
        <MessageList messages={messages} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={(content) => sendMessage({ text: content })}
        disabled={isLoading}
        isStreaming={isLoading}
      />
    </div>
  );
}
