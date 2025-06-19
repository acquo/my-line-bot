// AI 功能測試處理器

import { Hono } from 'hono';
import { AIService } from '../services/ai';
import { StorageService } from '../services/storage';
import { DatabaseService } from '../services/database';

export function createAITestHandler() {
  const app = new Hono<{ Bindings: CloudflareBindings }>();

  // POST /ai-test/chat - 測試 AI 對話功能
  app.post('/chat', async (c) => {
    try {
      const { AI, KV, DB } = c.env;
      const aiService = new AIService(AI);
      const storageService = new StorageService(KV);
      const databaseService = new DatabaseService(DB);

      const { message, userId = 'test-user' } = await c.req.json();

      if (!message) {
        return c.json({
          success: false,
          error: '請提供訊息內容'
        }, 400);
      }

      // 取得系統設定
      const settings = await storageService.getGlobalSettings();

      // 取得對話歷史
      const conversationHistory = await databaseService.getUserConversations(userId, settings.maxHistoryLength);

      // 生成 AI 回應
      const aiResponse = await aiService.generateResponse(
        message,
        conversationHistory,
        settings
      );

      // 儲存對話記錄
      await databaseService.saveConversation({
        user_id: userId,
        message_type: 'user',
        content: message
      });

      await databaseService.saveConversation({
        user_id: userId,
        message_type: 'assistant',
        content: aiResponse
      });

      return c.json({
        success: true,
        userMessage: message,
        aiResponse,
        settings: {
          model: settings.defaultModel,
          systemPrompt: settings.systemPrompt,
          historyLength: conversationHistory.length
        }
      });

    } catch (error) {
      console.error('AI 對話測試失敗:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      }, 500);
    }
  });

  // GET /ai-test/models - 測試可用的 AI 模型
  app.get('/models', async (c) => {
    try {
      const { AI } = c.env;
      const aiService = new AIService(AI);

      // 測試每個模型的可用性
      const models = [
        '@cf/meta/llama-3.1-8b-instruct',
        '@cf/meta/llama-3.1-70b-instruct',
        '@cf/mistral/mistral-7b-instruct-v0.1'
      ];

      const modelTests = [];

      for (const model of models) {
        try {
          const testResponse = await AI.run(model, {
            messages: [
              { role: 'system', content: '你是一個測試助手。' },
              { role: 'user', content: '請回應「測試成功」' }
            ],
            max_tokens: 10
          });

          modelTests.push({
            model,
            available: true,
            response: testResponse?.response || 'No response'
          });
        } catch (error) {
          modelTests.push({
            model,
            available: false,
            error: error instanceof Error ? error.message : '未知錯誤'
          });
        }
      }

      return c.json({
        success: true,
        models: modelTests,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('模型測試失敗:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      }, 500);
    }
  });

  // POST /ai-test/webhook-simulation - 模擬 LINE webhook 事件
  app.post('/webhook-simulation', async (c) => {
    try {
      const { message, userId = 'test-user-webhook' } = await c.req.json();

      if (!message) {
        return c.json({
          success: false,
          error: '請提供訊息內容'
        }, 400);
      }

      // 模擬 LINE webhook 事件結構
      const mockWebhookEvent = {
        type: 'message',
        mode: 'active',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: userId
        },
        webhookEventId: 'test-webhook-' + Date.now(),
        deliveryContext: {
          isRedelivery: false
        },
        message: {
          id: 'test-message-' + Date.now(),
          type: 'text',
          text: message
        },
        replyToken: 'test-reply-token-' + Date.now()
      };

      // 直接調用 webhook 處理邏輯（不通過 HTTP）
      const { AI, KV, DB } = c.env;
      const aiService = new AIService(AI);
      const storageService = new StorageService(KV);
      const databaseService = new DatabaseService(DB);

      // 檢查訊息是否適當
      if (!aiService.isMessageAppropriate(message)) {
        return c.json({
          success: false,
          error: '訊息內容不適當'
        }, 400);
      }

      // 儲存用戶訊息
      await databaseService.saveConversation({
        user_id: userId,
        message_type: 'user',
        content: message
      });

      // 取得對話歷史和設定
      const [conversationHistory, settings] = await Promise.all([
        databaseService.getUserConversations(userId, 10),
        storageService.getGlobalSettings()
      ]);

      // 生成 AI 回應
      const aiResponse = await aiService.generateResponse(
        message,
        conversationHistory,
        settings
      );

      // 限制回應長度
      const finalResponse = aiService.truncateResponse(aiResponse);

      // 儲存 AI 回應
      await databaseService.saveConversation({
        user_id: userId,
        message_type: 'assistant',
        content: finalResponse
      });

      return c.json({
        success: true,
        simulation: {
          webhookEvent: mockWebhookEvent,
          userMessage: message,
          aiResponse: finalResponse,
          conversationHistory: conversationHistory.length,
          settings: {
            model: settings.defaultModel,
            systemPrompt: settings.systemPrompt.substring(0, 100) + '...'
          }
        }
      });

    } catch (error) {
      console.error('Webhook 模擬測試失敗:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      }, 500);
    }
  });

  return app;
}
