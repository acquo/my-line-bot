// LINE Webhook 處理器

import { Hono } from 'hono';
import type { LineWebhookBody, LineWebhookEvent } from '../types/line';
import { verifyLineSignature } from '../utils/crypto';
import { DatabaseService } from '../services/database';
import { StorageService } from '../services/storage';
import { LineService } from '../services/line';
import { AIService } from '../services/ai';
import { RATE_LIMIT } from '../utils/constants';

export function createWebhookHandler() {
  const app = new Hono<{ Bindings: CloudflareBindings }>();

  // GET /webhook - 用於 LINE 平台驗證
  app.get('/', (c) => {
    return LineService.validateWebhook();
  });

  // POST /webhook - 處理 LINE 事件
  app.post('/', async (c) => {
    try {
      const { DB, KV, AI, LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET } = c.env;

      // 檢查必要的環境變數
      if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_CHANNEL_SECRET) {
        console.error('缺少 LINE API 憑證');
        return c.json({ error: '服務設定錯誤' }, 500);
      }

      // 取得請求內容
      const body = await c.req.text();
      const signature = c.req.header('x-line-signature');

      if (!signature) {
        console.error('缺少 LINE 簽名');
        return c.json({ error: '無效的請求' }, 400);
      }

      // 驗證簽名
      const isValidSignature = await verifyLineSignature(
        body,
        signature,
        LINE_CHANNEL_SECRET
      );

      if (!isValidSignature) {
        console.error('LINE 簽名驗證失敗');
        return c.json({ error: '簽名驗證失敗' }, 401);
      }

      console.log('ENTER WEBHOOK');

      // 解析 webhook 內容
      const webhookBody: LineWebhookBody = JSON.parse(body);

      // 初始化服務
      const dbService = new DatabaseService(DB);
      const storageService = new StorageService(KV);
      const lineService = new LineService(LINE_CHANNEL_ACCESS_TOKEN);
      const aiService = new AIService(AI);

      console.log('SERVICES INITIALIZED');

      // 使用 waitUntil 異步處理每個事件
      for (const event of webhookBody.events) {
        c.executionCtx.waitUntil(
          handleLineEvent(event, {
            dbService,
            storageService,
            lineService,
            aiService
          }).catch(error => {
            console.error('異步處理事件失敗:', error);
          })
        );
      }

      console.log('EXIT WEBHOOK - 立即回應，異步處理已啟動');

      // 立即回應 LINE 平台
      return c.json({ status: 'ok' });
    } catch (error) {
      console.error('Webhook 處理失敗:', error);
      return c.json({ error: '內部伺服器錯誤' }, 500);
    }
  });

  return app;
}

/**
 * 處理單個 LINE 事件（異步模式）
 */
async function handleLineEvent(
  event: LineWebhookEvent,
  services: {
    dbService: DatabaseService;
    storageService: StorageService;
    lineService: LineService;
    aiService: AIService;
  }
) {
  const { dbService, storageService, lineService, aiService } = services;

  // 只處理文字訊息事件
  if (event.type !== 'message' || !event.message || event.message.type !== 'text') {
    console.log('跳過非文字訊息事件');
    return;
  }

  const userId = event.source.userId;
  const userMessage = event.message.text;
  const replyToken = event.replyToken;

  if (!userId || !userMessage || !replyToken) {
    console.error('缺少必要的事件資料');
    return;
  }

  console.log(`開始處理用戶 ${userId} 的訊息: ${userMessage}`);

  try {
    // 檢查是否以 "/ai" 開頭
    if (!userMessage.startsWith('/ai')) {
      console.log(`用戶 ${userId} 的訊息不是以 /ai 開頭，跳過 AI 處理`);
      return; // 直接返回，不做任何回應
    }

    // 移除 "/ai" 前綴，取得實際要處理的訊息
    const actualMessage = userMessage.substring(3).trim();

    if (!actualMessage) {
      console.log(`用戶 ${userId} 只輸入了 /ai 沒有內容`);
      await lineService.replyMessage(
        replyToken,
        '請在 /ai 後面輸入您想問的問題，例如：/ai 你好'
      );
      return;
    }

    console.log(`用戶 ${userId} 的實際問題: ${actualMessage}`);

    // 檢查速率限制
    const canProceed = await storageService.checkRateLimit(
      userId,
      RATE_LIMIT.MAX_REQUESTS_PER_MINUTE
    );

    if (!canProceed) {
      console.log(`用戶 ${userId} 觸發速率限制`);
      await lineService.replyMessage(
        replyToken,
        '您的請求太頻繁了，請稍後再試。'
      );
      return;
    }

    // 檢查訊息內容是否適當
    if (!aiService.isMessageAppropriate(actualMessage)) {
      console.log(`用戶 ${userId} 的訊息內容不適當`);
      await lineService.replyMessage(
        replyToken,
        '抱歉，我無法回應這類內容。'
      );
      return;
    }

    // 儲存用戶訊息（儲存實際問題，不包含 /ai 前綴）
    await dbService.saveConversation({
      user_id: userId,
      message_type: 'user',
      content: actualMessage
    });

    console.log(`已儲存用戶 ${userId} 的訊息`);

    // 取得對話歷史和系統設定
    const [conversationHistory, settings] = await Promise.all([
      dbService.getUserConversations(userId, 10),
      storageService.getGlobalSettings()
    ]);

    console.log(`開始為用戶 ${userId} 生成 AI 回應`);

    // 生成 AI 回應（使用實際問題內容）
    const aiResponse = await aiService.generateResponse(
      actualMessage,
      conversationHistory,
      settings
    );

    // 限制回應長度
    const finalResponse = aiService.truncateResponse(aiResponse);

    console.log(`AI 回應生成完成，長度: ${finalResponse.length}`);

    // 儲存 AI 回應
    await dbService.saveConversation({
      user_id: userId,
      message_type: 'assistant',
      content: finalResponse
    });

    // 使用 Reply Token 發送回應
    await lineService.replyMessage(replyToken, finalResponse);
    console.log(`AI 回應已回覆給用戶 ${userId}`);

  } catch (error) {
    console.error(`處理用戶 ${userId} 訊息失敗:`, error);

    // 如果是在 AI 生成階段失敗，嘗試發送錯誤訊息
    // 但由於 Reply Token 可能已經使用，這裡可能會失敗
    console.log(`用戶 ${userId} 處理失敗，錯誤已記錄`);
  }
}
