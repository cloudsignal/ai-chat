declare module '@cloudsignal/mqtt-client' {
  export interface ConnectOptions {
    host: string;
    username?: string;
    password?: string;
    [key: string]: unknown;
  }

  export interface ConnectWithTokenOptions {
    host: string;
    organizationId: string;
    secretKey: string;
    userEmail: string;
  }

  export interface SubscribeOptions {
    qos?: 0 | 1 | 2;
  }

  export interface PublishOptions {
    qos?: 0 | 1 | 2;
    retain?: boolean;
  }

  export type MessageHandler = (topic: string, message: string) => void;

  export default class CloudSignalClient {
    constructor(options?: {
      preset?: string;
      tokenServiceUrl?: string;
      [key: string]: unknown;
    });
    connect(options: ConnectOptions): Promise<void>;
    connectWithToken(options: ConnectWithTokenOptions): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    subscribe(topic: string, options?: SubscribeOptions): Promise<void>;
    unsubscribe(topic: string): Promise<void>;
    transmit(
      topic: string,
      payload: unknown,
      options?: PublishOptions,
    ): Promise<void>;
    onMessage(handler: MessageHandler): void;
    offMessage(handler: MessageHandler): void;
  }
}
