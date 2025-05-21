import { LineEvent } from '../types/line.ts';
import { FoodAnalysis } from '../types/food.ts';
import { LineClient } from '../services/line.ts';
import { OpenAIClient } from '../services/openai.ts';
import { ValidationError } from '../utils/error.ts';

// 暫存食物資料
const tempFoodData: Map<string, FoodAnalysis> = new Map();

export async function handleImageMessage(
  event: LineEvent,
  lineClient: LineClient,
  openaiClient: OpenAIClient,
  prompts: { gptAssistantPrompt_Mandarin: string; gpt_user_prompt_Mandarin: string }
) {
  const { replyToken, message, source } = event;

  if (!message?.id) {
    throw new ValidationError('Invalid message id');
  }

  try {
    // 1. 取得圖片內容
    const imageBuffer = await lineClient.getMessageContent(message.id);
    const imageBase64 = btoa(String.fromCharCode(...imageBuffer));

    // 2. 呼叫 OpenAI API 分析圖片
    const response = await openaiClient.createChatCompletion({
      model: 'gpt-4-vision-preview',
      messages: [
        { role: 'system', content: prompts.gptAssistantPrompt_Mandarin },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompts.gpt_user_prompt_Mandarin },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${imageBase64}` }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 512
    });

    const parsedAnswer = JSON.parse(response.choices[0].message.content);

    // 3. 根據來源處理回應
    if (source.type === 'group') {
      await handleGroupImageResponse(event, lineClient, parsedAnswer);
    } else if (source.type === 'user') {
      await handlePrivateImageResponse(event, lineClient, parsedAnswer);
    }

    // 4. 儲存分析結果
    if (source.type === 'user') {
      tempFoodData.set(source.userId, {
        ...parsedAnswer,
        imageBase64
      });
    }

  } catch (error) {
    console.error('handleImageMessage Error:', error);
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: '抱歉，目前無法處理這張圖片。'
    });
  }
}

async function handleGroupImageResponse(
  event: LineEvent,
  lineClient: LineClient,
  parsedAnswer: FoodAnalysis
) {
  const { replyToken, source } = event;

  try {
    const profile = await lineClient.getProfile(source.userId);
    await lineClient.replyMessage(replyToken, [
      {
        type: 'text',
        text: '正在辨識你的食物中，請稍候...✨'
      },
      {
        type: 'textV2',
        text: `{user} ${parsedAnswer.text}`,
        substitution: {
          user: {
            type: 'mention',
            mentionee: {
              type: 'user',
              userId: profile.userId
            }
          }
        }
      }
    ]);
  } catch (error) {
    const err = error as { statusCode?: number };
    if (err.statusCode === 404) {
      await lineClient.replyMessage(replyToken, {
        type: 'text',
        text: `${parsedAnswer.text} \n記得加入此帳號為好友以獲得最佳體驗：）`
      });
    } else {
      throw error;
    }
  }
}

async function handlePrivateImageResponse(
  event: LineEvent,
  lineClient: LineClient,
  parsedAnswer: FoodAnalysis
) {
  const { replyToken } = event;
  const { text } = parsedAnswer;

  // 檢查文字是否包含數字
  const containsNumber = /\d/.test(text);
  let finalText = text;

  if (containsNumber) {
    finalText += "\n\n是否要儲存到您的紀錄？";
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: finalText,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '是',
              text: '儲存這筆記錄'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '否',
              text: '不用了'
            }
          }
        ]
      }
    });
  } else {
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: finalText
    });
  }
}

export { tempFoodData };
