// 測試處理器 (僅用於開發環境)

import { Hono } from 'hono';
import { DatabaseService } from '../services/database';
import { StorageService } from '../services/storage';

export function createTestHandler() {
  const app = new Hono<{ Bindings: CloudflareBindings }>();

  // POST /test/conversation - 測試對話儲存
  app.post('/conversation', async (c) => {
    try {
      const { DB } = c.env;
      const databaseService = new DatabaseService(DB);

      const testUserId = 'test-user-123';
      const testMessage = '這是一個測試訊息';

      // 儲存用戶訊息
      await databaseService.saveConversation({
        user_id: testUserId,
        message_type: 'user',
        content: testMessage
      });

      // 儲存 AI 回應
      await databaseService.saveConversation({
        user_id: testUserId,
        message_type: 'assistant',
        content: '這是 AI 的測試回應'
      });

      // 取得對話歷史
      const conversations = await databaseService.getUserConversations(testUserId);

      return c.json({
        success: true,
        message: '對話儲存測試成功',
        conversations
      });

    } catch (error) {
      console.error('對話儲存測試失敗:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      }, 500);
    }
  });

  // GET /test/settings - 測試設定讀取
  app.get('/settings', async (c) => {
    try {
      const { KV } = c.env;
      const storageService = new StorageService(KV);

      const settings = await storageService.getGlobalSettings();

      return c.json({
        success: true,
        settings: {
          defaultModel: settings.defaultModel,
          systemPrompt: settings.systemPrompt,
          maxHistoryLength: settings.maxHistoryLength,
          // 不回傳密碼
        }
      });

    } catch (error) {
      console.error('設定讀取測試失敗:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      }, 500);
    }
  });

  // POST /test/rate-limit - 測試速率限制
  app.post('/rate-limit', async (c) => {
    try {
      const { KV } = c.env;
      const storageService = new StorageService(KV);

      const testUserId = 'rate-limit-test-user';
      const results = [];

      // 測試多次請求
      for (let i = 0; i < 12; i++) {
        const allowed = await storageService.checkRateLimit(testUserId, 10);
        results.push({ attempt: i + 1, allowed });
      }

      return c.json({
        success: true,
        message: '速率限制測試完成',
        results
      });

    } catch (error) {
      console.error('速率限制測試失敗:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      }, 500);
    }
  });

  return app;
}
