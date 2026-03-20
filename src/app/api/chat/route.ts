import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { publishStreamToMqtt } from '@cloudsignal/ai-transport/server';
import { getServerMqttClient } from '@/lib/mqtt-server';

export async function POST(request: NextRequest) {
  const { chatId, messages, requestId } = await request.json();

  if (!chatId || !messages?.length) {
    return NextResponse.json(
      { error: 'chatId and messages are required' },
      { status: 400 },
    );
  }

  const mqttClient = await getServerMqttClient();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    messages,
  });

  // Fire-and-forget: publish AI stream to MQTT
  // Response is delivered to the client via MQTT subscription, not HTTP
  publishStreamToMqtt(mqttClient, chatId, result, { requestId }).catch(
    (err) => {
      console.error(`[chat] Stream publish error for ${chatId}:`, err);
    },
  );

  return NextResponse.json({ status: 'streaming', chatId }, { status: 202 });
}
