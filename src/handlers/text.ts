import type { WebhookEvent, TextMessage, MessageEvent, TextEventMessage } from '@line/bot-sdk';
import { LineClient } from '../services/line.ts';
import { OpenAIClient } from '../services/openai.ts';

export async function handleTextMessage(
  event: WebhookEvent,
  lineClient: LineClient,
  openaiClient: OpenAIClient,
  prompt: string
) {
  try {
    if (event.type === 'message' && event.message.type === 'text') {
      const messageEvent = event as MessageEvent;
      const textMessage = messageEvent.message as TextEventMessage;
      await handleGeneralConversation(
        textMessage.text,
        messageEvent.replyToken,
        lineClient,
        openaiClient,
        prompt
      );
    }
  } catch (error) {
    console.error('handleTextMessage Error:', error);
  }
}

async function handleGeneralConversation(
  userMessage: string,
  replyToken: string,
  lineClient: LineClient,
  openaiClient: OpenAIClient,
  prompt: string
) {
  try {
    const completion = await openaiClient.createChatCompletion({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.7,
      max_tokens: 512
    });

    const reply = completion.choices[0]?.message?.content || '抱歉，我無法理解您的訊息。';

    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: reply,
    } as TextMessage);
  } catch (error) {
    console.error('handleGeneralConversation Error:', error);
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: '抱歉，我現在無法回應，請稍後再試。',
    } as TextMessage);
  }
}
