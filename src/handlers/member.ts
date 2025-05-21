import { LineEvent } from '../types/line.ts';
import { LineClient } from '../services/line.ts';
import { DatabaseError } from '../utils/error.ts';

export async function handleMemberJoined(event: LineEvent, lineClient: LineClient) {
  const { replyToken } = event;
  await lineClient.replyMessage(replyToken, {
    type: 'text',
    text: '歡迎加入！我是您的健康飲食助手。\n您可以傳送食物照片給我，我會幫您分析營養成分。'
  });
}

export async function handleFollowEvent(event: LineEvent, lineClient: LineClient) {
  const { source, replyToken } = event;

  try {
    // 1. 取得用戶資料
    const profile = await lineClient.getProfile(source.userId);

    // 2. 建立用戶資料
    const response = await fetch(
      'https://lipo-out-backend-production.up.railway.app/users/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line_user_id: profile.userId,
          line_display_name: profile.displayName,
          line_picture_url: profile.pictureUrl || '',
          line_status_message: profile.statusMessage || ''
        })
      }
    );

    if (!response.ok) {
      throw new DatabaseError('Failed to create user');
    }

    // 3. 發送歡迎訊息
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: `Hi ${profile.displayName}！歡迎使用 LipoOut！\n\n您可以：\n1. 傳送食物照片給我分析營養成分\n2. 跟我聊天討論健康飲食相關問題\n\n讓我們一起邁向健康的生活！`
    });

  } catch (error) {
    console.error('handleFollowEvent Error:', error);
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: '歡迎加入！很抱歉，目前無法建立您的用戶資料。請稍後再試。'
    });
  }
}
