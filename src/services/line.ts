import { messagingApi, validateSignature, ClientConfig } from '@line/bot-sdk';

export class LineClient {
  #client: messagingApi.MessagingApiClient;
  #config: Required<ClientConfig>;
  #baseUrl = 'https://api-data.line.me/v2/bot';

  constructor(config: ClientConfig) {
    if (!config.channelSecret) {
      throw new Error('Channel secret is required');
    }
    this.#config = config as Required<ClientConfig>;
    this.#client = new messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken,
    });
  }

  verifySignature(body: string, signature: string): boolean {
    return validateSignature(body, this.#config.channelSecret, signature);
  }

  async replyMessage(replyToken: string, messages: messagingApi.Message | messagingApi.Message[]): Promise<messagingApi.ReplyMessageResponse> {
    return await this.#client.replyMessage({
      replyToken,
      messages: Array.isArray(messages) ? messages : [messages],
    });
  }

  async pushMessage(to: string, messages: messagingApi.Message | messagingApi.Message[]): Promise<messagingApi.PushMessageResponse> {
    return await this.#client.pushMessage({
      to,
      messages: Array.isArray(messages) ? messages : [messages],
    });
  }

  async getProfile(userId: string): Promise<messagingApi.UserProfileResponse> {
    return await this.#client.getProfile(userId);
  }

  async getMessageContent(messageId: string): Promise<ArrayBuffer> {
    const response = await fetch(`${this.#baseUrl}/message/${messageId}/content`, {
      headers: {
        Authorization: `Bearer ${this.#config.channelAccessToken}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to get message content: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  }
}
