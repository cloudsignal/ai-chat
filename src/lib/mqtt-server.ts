import mqtt, { MqttClient } from "mqtt";

let client: MqttClient | null = null;
let connectPromise: Promise<MqttClient> | null = null;

/**
 * Get or create the server-side MQTT client.
 * Connects via MQTTS (native MQTT over TLS) for lower overhead than WSS.
 * Singleton — shared across all API route invocations.
 */
export async function getServerMqttClient(): Promise<MqttClient> {
  if (client?.connected) return client;
  if (connectPromise) return connectPromise;

  connectPromise = createConnection();
  try {
    client = await connectPromise;
    return client;
  } finally {
    connectPromise = null;
  }
}

async function createConnection(): Promise<MqttClient> {
  const mqttsUrl = process.env.CLOUDSIGNAL_MQTTS_URL;
  if (!mqttsUrl) throw new Error("CLOUDSIGNAL_MQTTS_URL not configured");

  // Get server-side MQTT credentials from token service
  const credentials = await fetchServerCredentials();

  return new Promise((resolve, reject) => {
    const mqttClient = mqtt.connect(mqttsUrl, {
      username: credentials.username,
      password: credentials.password,
      clientId: `cs-ai-chat-server`,
      clean: false, // Persist session for QoS 1 message queuing
      keepalive: 60,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      protocolVersion: 5,
    });

    mqttClient.on("connect", () => {
      console.log("[mqtt-server] Connected via MQTTS");
      resolve(mqttClient);
    });

    mqttClient.on("error", (err) => {
      console.error("[mqtt-server] Connection error:", err.message);
      reject(err);
    });

    mqttClient.on("close", () => {
      console.log("[mqtt-server] Connection closed");
      client = null;
    });
  });
}

async function fetchServerCredentials(): Promise<{ username: string; password: string }> {
  const tokenServiceUrl = process.env.CLOUDSIGNAL_TOKEN_SERVICE_URL;
  const secretKey = process.env.CLOUDSIGNAL_SECRET_KEY;
  const orgId = process.env.CLOUDSIGNAL_ORG_ID;

  if (!tokenServiceUrl || !secretKey || !orgId) {
    throw new Error("CloudSignal credentials not configured");
  }

  const response = await fetch(`${tokenServiceUrl}/v1/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organization_id: orgId,
      secret_key: secretKey,
      user_email: "ai-agent@server.cloudsignal.app",
      replace_existing: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Token service error: ${error.detail || response.statusText}`);
  }

  const data = await response.json();
  return {
    username: data.mqtt_username,
    password: data.token_password,
  };
}

/**
 * Publish a JSON message to a topic with specified QoS and retain flag.
 */
export async function publishMessage(
  topic: string,
  payload: object,
  options: { qos?: 0 | 1 | 2; retain?: boolean } = {}
): Promise<void> {
  const mqttClient = await getServerMqttClient();
  const { qos = 0, retain = false } = options;

  return new Promise((resolve, reject) => {
    mqttClient.publish(topic, JSON.stringify(payload), { qos, retain }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
