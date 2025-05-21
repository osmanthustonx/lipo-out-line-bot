import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { getEnvConfig } from './config/env.ts';
import { LineClient } from './services/line.ts';
import { OpenAIClient } from './services/openai.ts';
import { handleImageMessage } from './handlers/image.ts';
import { handleTextMessage } from './handlers/text.ts';
import { handleMemberJoined, handleFollowEvent } from './handlers/member.ts';

// 讀取環境變數
const config = getEnvConfig();

// 讀取提示詞
const prompts = JSON.parse(await Deno.readTextFile('./prompts.json'));

// 初始化 LINE 和 OpenAI 客戶端
const lineClient = new LineClient({
  channelSecret: config.LINE_CHANNEL_SECRET,
  channelAccessToken: config.LINE_CHANNEL_ACCESS_TOKEN,
});

const openaiClient = new OpenAIClient(config.OPENAI_API_KEY);

// 建立 Express 應用程式
const app = express();

// 使用 body-parser 中間件來解析請求內容
app.use(bodyParser.text({ type: '*/*' }));

// check health
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// 設定 webhook 路由
app.post('/webhook', async (req: Request, res: Response) => {
  try {
    // 驗證簽名
    const signature = req.headers['x-line-signature'];
    if (!signature) {
      return res.status(400).send('Missing signature');
    }

    const body = req.body;
    const isValid = await lineClient.verifySignature(body, signature as string);
    if (!isValid) {
      return res.status(400).send('Invalid signature');
    }

    // 解析請求內容
    const { events } = JSON.parse(body);

    // 處理每個事件
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'image') {
        await handleImageMessage(event, lineClient, openaiClient, prompts);
      } else if (event.type === 'memberJoined') {
        await handleMemberJoined(event, lineClient);
      } else if (event.type === 'message' && event.message.type === 'text') {
        await handleTextMessage(event, lineClient, openaiClient, prompts);
      } else if (event.type === 'follow') {
        await handleFollowEvent(event, lineClient);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 處理其他路由
app.use((_req: Request, res: Response) => {
  res.status(404).send('Not Found');
});


// 啟動伺服器
app.listen(config.PORT, () => {
  console.log(`Starting server on port ${config.PORT}...`);
});

