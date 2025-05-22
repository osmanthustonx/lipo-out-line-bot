import type { WebhookEvent, TextMessage, MessageEvent, TextEventMessage } from '@line/bot-sdk';
import { LineClient } from '../services/line.ts';
import { OpenAIClient } from '../services/openai.ts';
import { LeaplyService } from '../services/leaply.ts';

export async function handleTextMessage(
  event: WebhookEvent,
  lineClient: LineClient,
  openaiClient: OpenAIClient,
  prompts: string
) {
  try {
    if (event.type === 'message' && event.message.type === 'text') {
      const messageEvent = event as MessageEvent;
      const textMessage = messageEvent.message as TextEventMessage;
      const messageText = textMessage.text;
      const userId = messageEvent.source.userId || 'unknown-user';
      
      // 檢查訊息來源類型
      const sourceType = messageEvent.source.type;
      
      // 在群組或多人聊天室中，檢查訊息是否包含特定前綴
      if (sourceType === 'group' || sourceType === 'room') {
        // 檢查訊息是否包含 'leaply' 關鍵字（不區分大小寫）
        if (messageText.toLowerCase().includes('leaply')) {
          // 如果包含旅行或規劃等關鍵字，使用 Leaply 服務
          if (messageText.includes('旅行') || messageText.includes('規劃') || messageText.includes('行程')) {
            await handleLeaplyConversation(
              messageText,
              messageEvent.replyToken,
              lineClient,
              openaiClient,
              prompts,
              userId
            );
          } else {
            // 否則使用一般對話
            await handleGeneralConversation(
              messageText,
              messageEvent.replyToken,
              lineClient,
              openaiClient,
              prompts
            );
          }
        }
        // 如果不包含前綴，則不處理
      } else {
        // 私聊中，檢查是否是 Leaply 相關請求
        if (messageText.includes('旅行') || messageText.includes('規劃') || messageText.includes('行程')) {
          await handleLeaplyConversation(
            messageText,
            messageEvent.replyToken,
            lineClient,
            openaiClient,
            prompts,
            userId
          );
        } else {
          // 否則使用一般對話
          await handleGeneralConversation(
            messageText,
            messageEvent.replyToken,
            lineClient,
            openaiClient,
            prompts
          );
        }
      }
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
      model: 'meta-llama/llama-3.3-8b-instruct:free',
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

async function handleLeaplyConversation(
  userMessage: string,
  replyToken: string,
  lineClient: LineClient,
  openaiClient: OpenAIClient,
  prompt: string,
  userId: string
) {
  try {
    const leaplyService = new LeaplyService(openaiClient, userId);
    const reply = await leaplyService.processMessage(userMessage, prompt);

    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: reply,
    } as TextMessage);
  } catch (error) {
    console.error('handleLeaplyConversation Error:', error);
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: '抱歉，我現在無法回應，請稍後再試。',
    } as TextMessage);
  }
}
