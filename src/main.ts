import * as line from '@line/bot-sdk';
import express, { Request, Response } from 'express';
import { envConfig } from './config/env.ts';
import { handleTextMessage } from './handlers/text.ts';
import { LineClient } from './services/line.ts';
import { OpenAIClient } from './services/openai.ts';

// 讀取提示詞
const prompts = JSON.parse(await Deno.readTextFile('./prompts.json'));

// 初始化 LINE 和 OpenAI 客戶端
const lineClient = new LineClient({
  channelSecret: envConfig.LINE_CHANNEL_SECRET,
  channelAccessToken: envConfig.LINE_CHANNEL_ACCESS_TOKEN,
});

const openaiClient = new OpenAIClient(envConfig.OPENAI_API_KEY);

// 建立 Express 應用程式
const app = express();

// check health
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// 設定 webhook 路由
app.post('/webhook',
  line.middleware({ channelSecret: envConfig.LINE_CHANNEL_SECRET }),
  async (req: Request, res: Response) => {
    try {
      const events: line.WebhookEvent[] = req.body.events;
      // 處理每個事件
      for (const event of events) {
        await handleTextMessage(event, lineClient, openaiClient, prompts.gptAssistantPrompt_Mandarin);
      }
    } catch (error) {
      console.error('Server Error:', error);
      res.status(500).send('Internal Server Error');
    }
    res.status(200).send('OK');
  });

// 處理其他路由
app.use((_req: Request, res: Response) => {
  res.status(404).send('Not Found');
});


// 啟動伺服器
app.listen(envConfig.PORT, () => {
  console.log(`Starting server on port ${envConfig.PORT}...`);
});

