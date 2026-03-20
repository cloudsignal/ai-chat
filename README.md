# CloudSignal AI Chat

A standard Vercel AI SDK chat app — with CloudSignal MQTT as the transport layer instead of HTTP streaming.

## The Drop-In

This is the only line that changes:

```typescript
// Default — HTTP streaming
const { messages, sendMessage } = useChat();

// CloudSignal — MQTT streaming (offline recovery, multi-device, ACL)
const { messages, sendMessage } = useChat({
  transport: new CloudSignalChatTransport({
    api: '/api/chat',
    authEndpoint: '/api/auth/mqtt',
    wssUrl: 'wss://connect.cloudsignal.app:18885/',
  }),
});
```

Same `messages`. Same `sendMessage`. Same UI code. Different infrastructure.

The `CloudSignalChatTransport` implements the Vercel AI SDK `ChatTransport` interface. Every feature of the SDK — streaming, error states, abort signals — works as normal. The browser just receives tokens over WebSocket instead of an HTTP response body.

## Why MQTT for AI Chat

- **Offline recovery via retained messages** — the broker holds the completed response. Reconnect and the full answer is delivered immediately, no re-request needed.
- **Multi-device sync** — subscribe from phone and desktop simultaneously; both receive every token.
- **No per-message pricing** — unlike Ably or Pusher, CloudSignal has no per-message fees.
- **ISO standard protocol** — MQTT is ISO/IEC 20922. Any MQTT client library works, no vendor lock-in.
- **QoS guarantees** — use QoS 0 for disposable token stream, QoS 1 for guaranteed delivery of critical messages.
- **Broker-level tenant isolation** — VerneMQ mountpoints isolate organizations at the broker, not in application code.
- **Per-message ACL enforcement** — topic-level access control on every publish and subscribe, not just at connection time.

## Architecture

```
Browser (React)                          Next.js API Route
    |                                         |
    | WSS (port 18885)                        | MQTTS (port 8883)
    | @cloudsignal/mqtt-client                | @cloudsignal/mqtt-client
    |                                         |
    +---------> CloudSignal Broker <----------+
```

The browser connects via WebSocket Secure using `@cloudsignal/mqtt-client`. The Next.js API route connects via native MQTTS using the same package. Both talk to the same broker, same topics.

## How It Works

1. `useChat` calls `transport.sendMessages()` — an HTTP POST that triggers the server.
2. The server calls Claude via AI SDK `streamText()` and publishes `UIMessageChunk` objects to MQTT as tokens arrive.
3. The browser's MQTT subscription converts the incoming messages into a `ReadableStream` that the AI SDK consumes normally.
4. On disconnect and reconnect, the broker delivers the retained complete response — no data loss, no re-request.

## Quick Start

```bash
git clone <repo-url>
cd cloudsignal-ai-chat
npm install
cp .env.example .env.local
# Edit .env.local with your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start chatting.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key from [console.anthropic.com](https://console.anthropic.com) |
| `CLOUDSIGNAL_TOKEN_SERVICE_URL` | Token service URL (default: `https://auth.cloudsignal.app`) |
| `CLOUDSIGNAL_SECRET_KEY` | Organization secret key from CloudSignal dashboard |
| `CLOUDSIGNAL_ORG_ID` | Organization UUID from CloudSignal dashboard |
| `NEXT_PUBLIC_CLOUDSIGNAL_WSS_URL` | WSS endpoint (default: `wss://connect.cloudsignal.app:18885/`) |
| `CLOUDSIGNAL_MQTTS_URL` | MQTTS endpoint for server (default: `mqtts://connect.cloudsignal.app:8883`) |

Copy `.env.example` to `.env.local` and fill in your values.

## MQTT Topic Structure

| Topic | QoS | Retained | Purpose |
|-------|-----|----------|---------|
| `chat/{chatId}/stream` | 0 | No | UIMessageChunk stream |
| `chat/{chatId}/complete` | 1 | Yes | Full response for offline recovery |

## Edge Case Handling

The transport handles the following without any application code:

- Stream timeout (server crash protection — stream is closed after a configurable idle period)
- HTTP error propagation (non-2xx responses are surfaced as AI SDK errors)
- Request ID filtering (prevents interleaved chunks from concurrent requests)
- Stale retained message validation (ignores retained messages from previous sessions)
- Subscription cleanup (unsubscribes and disconnects on abort or completion)

## Security

See [MQTT AI Chat Security Spec](../docs/superpowers/specs/2026-03-20-mqtt-ai-chat-security-spec.md) for a detailed comparison of CloudSignal MQTT vs HTTP streaming and proprietary services.

## Tech Stack

- [Next.js 16](https://nextjs.org/) with App Router
- [React 19](https://react.dev/)
- [Vercel AI SDK](https://sdk.vercel.ai/) (`ai` package) for `useChat`, `streamText`, and `UIMessageChunk`
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) for Claude
- [Tailwind CSS](https://tailwindcss.com/) for styling

## Packages

- **`@cloudsignal/ai-transport`** — the `CloudSignalChatTransport` class that implements the Vercel AI SDK `ChatTransport` interface over MQTT.
- **`@cloudsignal/mqtt-client`** — shared MQTT client used by both the browser (WSS) and the server (MQTTS).

## Limitations

- **In-memory conversation history** — chat history is stored in server memory and will be lost on restart. For production, replace with a persistent store (database, Redis, etc.).
- **Unauthenticated auth endpoint** — the `/api/auth/mqtt` endpoint has no authentication. For any deployment beyond localhost, add rate limiting or session-based access control.

## License

MIT
