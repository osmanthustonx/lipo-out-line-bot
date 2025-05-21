import { LineConfig, LineProfile } from '../types/line.ts';
import { LineApiError } from '../utils/error.ts';

export class LineClient {
  private baseUrl = 'https://api.line.me/v2/bot';
  private config: LineConfig;

  constructor(config: LineConfig) {
    this.config = config;
  }

  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.config.channelAccessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new LineApiError(`LINE API error: ${response.statusText}`, response.status);
      }

      return response;
    } catch (error) {
      if (error instanceof LineApiError) {
        throw error;
      }
      const err = error as Error;
      throw new LineApiError(`Network error: ${err.message}`);
    }
  }

  async replyMessage(replyToken: string, messages: unknown): Promise<void> {
    await this.request('/message/reply', {
      method: 'POST',
      body: JSON.stringify({
        replyToken,
        messages: Array.isArray(messages) ? messages : [messages],
      }),
    });
  }

  async getProfile(userId: string): Promise<LineProfile> {
    const response = await this.request(`/profile/${userId}`);
    return response.json();
  }

  async getMessageContent(messageId: string): Promise<Uint8Array> {
    const response = await this.request(`/message/${messageId}/content`, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });
    return new Uint8Array(await response.arrayBuffer());
  }

  async verifySignature(body: string, signature: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const key = encoder.encode(this.config.channelSecret);
    const message = encoder.encode(body);
    
    const keyObject = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signed = await crypto.subtle.sign(
      'HMAC',
      keyObject,
      message
    );
    
    const signatureBuffer = new Uint8Array(signed);
    const expectedSignature = Array.from(signatureBuffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return expectedSignature === signature;
  }
}
