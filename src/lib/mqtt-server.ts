import CloudSignalClient from '@cloudsignal/mqtt-client';

let client: CloudSignalClient | null = null;
let connectPromise: Promise<CloudSignalClient> | null = null;

/**
 * Server-side CloudSignal MQTT singleton.
 * Uses the 'server' preset: MQTTS, 1s reconnect, persistent session, unlimited retries.
 */
export async function getServerMqttClient(): Promise<CloudSignalClient> {
  if (client?.isConnected()) return client;
  if (connectPromise) return connectPromise;

  connectPromise = createConnection();
  try {
    client = await connectPromise;
    return client;
  } finally {
    connectPromise = null;
  }
}

async function createConnection(): Promise<CloudSignalClient> {
  const mqttClient = new CloudSignalClient({
    preset: 'server',
    tokenServiceUrl: process.env.CLOUDSIGNAL_TOKEN_SERVICE_URL!,
  });

  await mqttClient.connectWithToken({
    host: process.env.CLOUDSIGNAL_MQTTS_URL!,
    organizationId: process.env.CLOUDSIGNAL_ORG_ID!,
    secretKey: process.env.CLOUDSIGNAL_SECRET_KEY!,
    userEmail: 'ai-server@system.cloudsignal.app',
  });

  return mqttClient;
}
