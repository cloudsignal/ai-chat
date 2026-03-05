declare module "@cloudsignal/mqtt-client" {
  interface ClientOptions {
    debug?: boolean;
    preset?: "auto" | "mobile" | "desktop" | "agent" | "server";
    tokenServiceUrl?: string;
    keepalive?: number;
    connectTimeout?: number;
    reconnectPeriod?: number;
    protocolVersion?: 4 | 5;
    cleanSession?: boolean;
    [key: string]: unknown;
  }

  interface ConnectionConfig {
    host: string;
    username?: string;
    password?: string;
    clientId?: string;
  }

  interface TokenAuthConfig {
    host: string;
    organizationId: string;
    secretKey?: string;
    userEmail?: string;
    externalToken?: string;
    clientId?: string;
  }

  interface PublishOptions {
    qos?: 0 | 1 | 2;
    retain?: boolean;
  }

  class CloudSignalClient {
    constructor(options?: ClientOptions);
    connect(config: ConnectionConfig): Promise<void>;
    connectWithToken(config: TokenAuthConfig): Promise<void>;
    subscribe(
      topic: string,
      options?: { qos?: number; callback?: (topic: string, message: string, packet?: unknown) => void } | number
    ): Promise<void>;
    unsubscribe(topic: string): Promise<void>;
    transmit(topic: string, message: string | object, options?: PublishOptions): Promise<void>;
    onMessage(callback: (topic: string, message: string, packet?: unknown) => void): void;
    offMessage(callback: (topic: string, message: string, packet?: unknown) => void): void;
    isConnected(): boolean;
    getConnectionState(): string;
    disconnect(force?: boolean): Promise<void>;
    destroy(): void;
    getClientId(): string | null;
    onConnectionStatusChange: ((connected: boolean, state?: string) => void) | null;
    onReconnecting: ((attempt: number) => void) | null;
    onAuthError: ((error: Error) => void) | null;
  }

  export default CloudSignalClient;
  export { CloudSignalClient };
}
