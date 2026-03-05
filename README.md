# CloudSignal AI Chat

Real-time AI chat powered by Claude, delivered over CloudSignal MQTT. This project demonstrates MQTT as a drop-in replacement for traditional AI chat transport layers (HTTP streaming, Ably, Pusher).

## Why MQTT for AI Chat?

- **Offline recovery via retained messages** -- the broker holds state, not the client. Reconnect and pick up where you left off.
- **Multi-device sync** -- subscribe from phone and desktop simultaneously; both receive every token.
- **No per-message pricing** -- unlike Ably or Pusher, MQTT has no per-message fees.
- **Standard protocol** -- MQTT is an ISO standard (ISO/IEC 20922). Any client library works, no vendor lock-in.
- **Dual transport** -- server uses native MQTTS (lower latency), browser uses WSS. Same broker, same topics.
- **QoS guarantees** -- critical messages (stream status, full responses) use QoS 1 for at-least-once delivery.
- **Built-in multi-tenancy** -- VerneMQ mountpoints isolate organizations at the broker level.

## Architecture

```
Browser (React)                          Next.js API Route
    |                                         |
    | WSS (port 18885)                        | MQTTS (port 8883)
    | WebSocket transport                     | Native MQTT over TLS
    |                                         |
    +---------> CloudSignal Broker <----------+
```

The browser connects via WebSocket Secure (WSS) using `@cloudsignal/mqtt-client`. The Next.js API route connects via native MQTTS using the `mqtt` package (MQTT.js). Both publish and subscribe to the same topics on the same broker.

## How It Works

1. User sends a message via HTTP POST to `/api/chat`
2. The API route calls the Claude streaming API
3. As tokens arrive, each is published to `chat/{sessionId}/response` (QoS 0)
4. The browser client subscribes via WSS and renders tokens in real-time
5. When the stream completes, the full response is published as a retained message for offline recovery

## Quick Start

```bash
git clone <repo-url>
cd cloudsignal-ai-chat
npm install
cp .env.example .env.local
# Edit .env.local with your keys (see Environment Variables below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start chatting.

## MQTT Topic Structure

| Topic | QoS | Retained | Purpose |
|-------|-----|----------|---------|
| `chat/{sessionId}/messages` | 1 | No | User messages |
| `chat/{sessionId}/response` | 0 | No | AI token stream |
| `chat/{sessionId}/response/status` | 1 | Yes | Stream lifecycle (start, end, error) |
| `chat/{sessionId}/response/complete` | 1 | Yes | Full assembled response |
| `chat/{sessionId}/typing` | 0 | No | Typing indicators |
| `chat/{sessionId}/metadata` | 1 | Yes | Session metadata |

## Offline Recovery

When a client disconnects mid-stream:

- The server continues streaming from Claude, publishing each token and the final response
- Retained messages are stored on the broker: `response/complete` and `response/status`
- When the client reconnects, the broker delivers the retained messages immediately
- No data loss, no re-request needed

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

## CloudSignal Setup

1. Create an account at [dashboard.cloudsignal.app](https://dashboard.cloudsignal.app)
2. Create an organization
3. Add an ACL rule: topic pattern `chat/#`, access: publish + subscribe
4. Copy your org UUID and secret key into `.env.local`

## Tech Stack

- [Next.js 16](https://nextjs.org/) with App Router
- [React 19](https://react.dev/)
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) for Claude streaming
- [mqtt](https://github.com/mqttjs/MQTT.js) (MQTT.js) for server-side MQTTS
- [@cloudsignal/mqtt-client](https://www.npmjs.com/package/@cloudsignal/mqtt-client) for browser-side WSS
- [Tailwind CSS](https://tailwindcss.com/) for styling

## Limitations

- **In-memory conversation history** — Chat history is stored in server memory and will be lost on restart. For production, replace with a persistent store (database, Redis, etc.).
- **No token refresh** — MQTT credentials expire after 60 minutes. The demo does not automatically refresh tokens. For long sessions, implement a refresh timer using the `refreshRecommendedAt` field from the auth response.
- **Unauthenticated auth endpoint** — The `/api/auth/mqtt` endpoint has no authentication. For any deployment beyond localhost, add rate limiting or session-based access control.

## License

MIT
