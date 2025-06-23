// 測試處理器 (僅用於開發環境)

import { Hono } from 'hono';
import { DatabaseService } from '../services/database';
import { StorageService } from '../services/storage';
import { AIService } from '../services/ai';

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

  // POST /test/webhook-trace - 測試 Webhook 追蹤記錄
  app.post('/webhook-trace', async (c) => {
    try {
      const { DB } = c.env;
      const databaseService = new DatabaseService(DB);

      // 創建一些測試的 webhook 追蹤記錄
      const testTraces = [
        {
          user_id: 'test-user-001',
          event_type: 'message',
          message_content: '/ai 你好，這是測試訊息',
          raw_event: JSON.stringify({
            type: 'message',
            source: { userId: 'test-user-001' },
            message: { type: 'text', text: '/ai 你好，這是測試訊息' },
            timestamp: Date.now()
          })
        },
        {
          user_id: 'test-user-002',
          event_type: 'message',
          message_content: '/ai 請問今天天氣如何？',
          raw_event: JSON.stringify({
            type: 'message',
            source: { userId: 'test-user-002' },
            message: { type: 'text', text: '/ai 請問今天天氣如何？' },
            timestamp: Date.now()
          })
        },
        {
          user_id: 'test-user-003',
          event_type: 'follow',
          message_content: undefined,
          raw_event: JSON.stringify({
            type: 'follow',
            source: { userId: 'test-user-003' },
            timestamp: Date.now()
          })
        }
      ];

      // 儲存測試記錄
      for (const trace of testTraces) {
        await databaseService.saveWebhookTrace(trace);
      }

      // 取得最新的追蹤記錄
      const traces = await databaseService.getRecentWebhookTraces(10);

      return c.json({
        success: true,
        message: 'Webhook 追蹤測試成功',
        tracesCreated: testTraces.length,
        traces
      });

    } catch (error) {
      console.error('Webhook 追蹤測試失敗:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      }, 500);
    }
  });

  // POST /test/mcp - 測試 MCP 功能
  app.post('/mcp', async (c) => {
    try {
      const { AI } = c.env;
      const aiService = new AIService(AI);

      const { query } = await c.req.json().catch(() => ({ query: 'test' }));

      console.log('開始測試 MCP 功能，查詢:', query);

      // 測試 MCP 連接和功能
      const testResult = await aiService.testMCP(query);

      // 獲取連接狀態和統計
      const status = aiService.getMCPConnectionStatus();
      const stats = aiService.getMCPStats();

      return c.json({
        success: true,
        message: 'MCP 測試完成',
        testResult,
        status,
        stats
      });

    } catch (error) {
      console.error('MCP 測試失敗:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      }, 500);
    }
  });

  // POST /test/mcp-ai - 測試 MCP 整合的 AI 回應
  app.post('/mcp-ai', async (c) => {
    try {
      const { AI, DB, KV } = c.env;
      const aiService = new AIService(AI);
      const databaseService = new DatabaseService(DB);
      const storageService = new StorageService(KV);

      const { message } = await c.req.json().catch(() => ({ message: '測試 MCP 整合功能' }));

      console.log('開始測試 MCP 整合的 AI 回應，訊息:', message);

      // 獲取系統設定
      const settings = await storageService.getGlobalSettings();

      // 模擬對話歷史
      const conversationHistory = await databaseService.getUserConversations('test-mcp-user', 5);

      // 生成包含 MCP 上下文的 AI 回應
      const aiResponse = await aiService.generateResponse(message, conversationHistory, settings);

      // 獲取 MCP 狀態
      const mcpStatus = aiService.getMCPConnectionStatus();

      return c.json({
        success: true,
        message: 'MCP 整合 AI 測試完成',
        userMessage: message,
        aiResponse,
        mcpStatus,
        responseLength: aiResponse.length
      });

    } catch (error) {
      console.error('MCP 整合 AI 測試失敗:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      }, 500);
    }
  });

  return app;
}
