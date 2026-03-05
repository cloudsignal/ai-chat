import { NextResponse } from "next/server";
import type { MqttCredentials } from "@/lib/types";

export async function POST() {
  const tokenServiceUrl = process.env.CLOUDSIGNAL_TOKEN_SERVICE_URL;
  const secretKey = process.env.CLOUDSIGNAL_SECRET_KEY;
  const orgId = process.env.CLOUDSIGNAL_ORG_ID;

  if (!tokenServiceUrl || !secretKey || !orgId) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(`${tokenServiceUrl}/v1/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organization_id: orgId,
        secret_key: secretKey,
        user_email: `user-${crypto.randomUUID().slice(0, 8)}@chat.cloudsignal.app`,
        replace_existing: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "Token creation failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    const credentials: MqttCredentials = {
      username: data.mqtt_username,
      password: data.token_password,
      orgShortId: data.org_short_id,
      expiresAt: data.expires_at,
      refreshRecommendedAt: data.refresh_recommended_at,
    };

    return NextResponse.json(credentials);
  } catch {
    return NextResponse.json({ error: "Failed to connect to token service" }, { status: 502 });
  }
}
