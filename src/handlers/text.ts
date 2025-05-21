import { LineEvent } from '../types/line.ts';
import { LineClient } from '../services/line.ts';
import { OpenAIClient } from '../services/openai.ts';
import { tempFoodData } from './image.ts';
import { DatabaseError } from '../utils/error.ts';

export async function handleTextMessage(
  event: LineEvent,
  lineClient: LineClient,
  openaiClient: OpenAIClient,
  prompts: { gpt_systemp_prompt_Mandarin: string }
) {
  const { replyToken, message, source } = event;

  if (!message?.text) {
    return;
  }

  try {
    if (source.type === 'user') {
      const userId = source.userId;
      const userMessage = message.text;

      // Case 1: 使用者要儲存食物記錄
      if (userMessage === '儲存這筆記錄') {
        await handleSaveFoodRecord(userId, replyToken, lineClient);
      }
      // Case 2: 使用者不要儲存
      else if (userMessage === '不用了') {
        await handleRejectSave(userId, replyToken, lineClient);
      }
      // Case 3: 一般對話
      else {
        await handleGeneralConversation(userMessage, replyToken, lineClient, openaiClient, prompts);
      }
    }
  } catch (error) {
    console.error('handleTextMessage Error:', error);
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: '抱歉，處理您的訊息時發生錯誤。'
    });
  }
}

async function handleSaveFoodRecord(
  userId: string,
  replyToken: string,
  lineClient: LineClient
) {
  const tempData = tempFoodData.get(userId);
  if (!tempData) {
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: '抱歉，無法找到分析資料，請再試一次。'
    });
    return;
  }

  try {
    // 1. 查找使用者的資料庫 ID
    const userResponse = await fetch(
      `https://lipo-out-backend-production.up.railway.app/users/?line_user_id=${userId}`
    );
    
    if (!userResponse.ok) {
      throw new DatabaseError('Failed to fetch user data');
    }

    const userData = await userResponse.json();
    const foundUser = userData[0];
    
    if (!foundUser) {
      await lineClient.replyMessage(replyToken, {
        type: 'text',
        text: '抱歉，尚未建立用戶資料。請先加我為好友或重新嘗試。'
      });
      return;
    }

    // 2. 儲存食物記錄
    const foodResponse = await fetch(
      'https://lipo-out-backend-production.up.railway.app/foods/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: foundUser.id,
          food_analysis: tempData.text,
          food_photo: tempData.imageBase64,
          protein: tempData.protein,
          carb: tempData.carbohydrates,
          fat: tempData.fat,
          calories: tempData.calories
        })
      }
    );

    if (!foodResponse.ok) {
      throw new DatabaseError('Failed to save food record');
    }

    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: '已為您儲存此食物紀錄！'
    });

    // 清除暫存資料
    tempFoodData.delete(userId);

  } catch (error) {
    console.error('Save food record error:', error);
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: '無法儲存此食物紀錄，請稍後再試。'
    });
  }
}

async function handleRejectSave(
  userId: string,
  replyToken: string,
  lineClient: LineClient
) {
  await lineClient.replyMessage(replyToken, {
    type: 'text',
    text: '好的，沒有儲存這筆資料。'
  });
  tempFoodData.delete(userId);
}

async function handleGeneralConversation(
  userMessage: string,
  replyToken: string,
  lineClient: LineClient,
  openaiClient: OpenAIClient,
  prompts: { gpt_systemp_prompt_Mandarin: string }
) {
  const response = await openaiClient.createChatCompletion({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: prompts.gpt_systemp_prompt_Mandarin },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 512
  });

  const answer = response.choices[0].message.content.trim();
  
  await lineClient.replyMessage(replyToken, {
    type: 'text',
    text: answer
  });
}
