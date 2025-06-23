// 管理後台 API 處理器

import { Hono } from 'hono';
import { StorageService } from '../services/storage';
import { DatabaseService } from '../services/database';
import { AIService } from '../services/ai';
import { authMiddleware } from './auth';
import type { UpdateSettingsRequest } from '../types/settings';
import { SUPPORTED_MODELS } from '../types/settings';

export function createAdminHandler() {
  const app = new Hono<{ Bindings: CloudflareBindings }>();

  // GET /admin/settings - 取得系統設定
  app.get('/settings', authMiddleware(), async (c) => {
    try {
      const { KV } = c.env;
      const storageService = new StorageService(KV);

      const settings = await storageService.getGlobalSettings();

      return c.json({
        success: true,
        settings: {
          defaultModel: settings.defaultModel,
          systemPrompt: settings.systemPrompt,
          maxHistoryLength: settings.maxHistoryLength
        },
        availableModels: SUPPORTED_MODELS
      });

    } catch (error) {
      console.error('取得設定失敗:', error);
      return c.json({
        success: false,
        error: '無法取得系統設定'
      }, 500);
    }
  });

  // PUT /admin/settings - 更新系統設定
  app.put('/settings', authMiddleware(), async (c) => {
    try {
      const { KV } = c.env;
      const storageService = new StorageService(KV);

      const updates: UpdateSettingsRequest = await c.req.json();

      // 驗證模型是否支援
      if (updates.defaultModel && !Object.values(SUPPORTED_MODELS).includes(updates.defaultModel as any)) {
        return c.json({
          success: false,
          error: '不支援的 AI 模型'
        }, 400);
      }

      // 驗證數值範圍
      if (updates.maxHistoryLength && (updates.maxHistoryLength < 1 || updates.maxHistoryLength > 50)) {
        return c.json({
          success: false,
          error: '對話歷史長度必須在 1-50 之間'
        }, 400);
      }

      const updatedSettings = await storageService.updateSettings(updates);

      return c.json({
        success: true,
        message: '設定更新成功',
        settings: {
          defaultModel: updatedSettings.defaultModel,
          systemPrompt: updatedSettings.systemPrompt,
          maxHistoryLength: updatedSettings.maxHistoryLength
        }
      });

    } catch (error) {
      console.error('更新設定失敗:', error);
      return c.json({
        success: false,
        error: '無法更新系統設定'
      }, 500);
    }
  });

  // POST /admin/password - 更新管理員密碼
  app.post('/password', authMiddleware(), async (c) => {
    try {
      const { KV } = c.env;
      const storageService = new StorageService(KV);

      const { newPassword } = await c.req.json();

      if (!newPassword || newPassword.length < 6) {
        return c.json({
          success: false,
          error: '密碼長度至少需要 6 個字元'
        }, 400);
      }

      await storageService.updateAdminPassword(newPassword);

      return c.json({
        success: true,
        message: '密碼更新成功'
      });

    } catch (error) {
      console.error('更新密碼失敗:', error);
      return c.json({
        success: false,
        error: '無法更新密碼'
      }, 500);
    }
  });

  // GET /admin/traces - 取得 Webhook 追蹤記錄
  app.get('/traces', authMiddleware(), async (c) => {
    try {
      const { DB } = c.env;
      const databaseService = new DatabaseService(DB);

      const limit = parseInt(c.req.query('limit') || '10');
      const traces = await databaseService.getRecentWebhookTraces(Math.min(limit, 50));

      return c.json({
        success: true,
        traces: traces.map(trace => ({
          id: trace.id,
          userId: trace.user_id,
          eventType: trace.event_type,
          messageContent: trace.message_content,
          timestamp: trace.timestamp,
          rawEvent: trace.raw_event ? JSON.parse(trace.raw_event) : null
        }))
      });

    } catch (error) {
      console.error('取得追蹤記錄失敗:', error);
      return c.json({
        success: false,
        error: '無法取得追蹤記錄'
      }, 500);
    }
  });

  // GET /admin/mcp/status - 取得 MCP 連接狀態
  app.get('/mcp/status', authMiddleware(), async (c) => {
    try {
      const { AI } = c.env;
      const aiService = new AIService(AI);

      const status = aiService.getMCPConnectionStatus();
      const stats = aiService.getMCPStats();

      return c.json({
        success: true,
        status,
        stats
      });

    } catch (error) {
      console.error('取得 MCP 狀態失敗:', error);
      return c.json({
        success: false,
        error: '無法取得 MCP 狀態'
      }, 500);
    }
  });

  // POST /admin/mcp/connect - 手動連接 MCP Server
  app.post('/mcp/connect', authMiddleware(), async (c) => {
    try {
      const { AI } = c.env;
      const aiService = new AIService(AI);

      const success = await aiService.connectToMCP();

      return c.json({
        success,
        message: success ? 'MCP 連接成功' : 'MCP 連接失敗'
      });

    } catch (error) {
      console.error('MCP 連接失敗:', error);
      return c.json({
        success: false,
        error: '無法連接到 MCP Server'
      }, 500);
    }
  });

  // POST /admin/mcp/disconnect - 斷開 MCP 連接
  app.post('/mcp/disconnect', authMiddleware(), async (c) => {
    try {
      const { AI } = c.env;
      const aiService = new AIService(AI);

      aiService.disconnectMCP();

      return c.json({
        success: true,
        message: 'MCP 連接已斷開'
      });

    } catch (error) {
      console.error('MCP 斷開失敗:', error);
      return c.json({
        success: false,
        error: '無法斷開 MCP 連接'
      }, 500);
    }
  });

  // POST /admin/mcp/test - 測試 MCP 功能
  app.post('/mcp/test', authMiddleware(), async (c) => {
    try {
      const { AI } = c.env;
      const aiService = new AIService(AI);

      const { query } = await c.req.json().catch(() => ({ query: 'test' }));
      const result = await aiService.testMCP(query);

      return c.json({
        success: result.success,
        contexts: result.contexts,
        error: result.error,
        message: result.success ?
          `測試成功，獲取到 ${result.contexts.length} 個上下文項目` :
          '測試失敗'
      });

    } catch (error) {
      console.error('MCP 測試失敗:', error);
      return c.json({
        success: false,
        error: '無法測試 MCP 功能'
      }, 500);
    }
  });

  // GET /admin/mcp/config - 獲取 MCP 配置
  app.get('/mcp/config', authMiddleware(), async (c) => {
    try {
      const { KV } = c.env;
      const storageService = new StorageService(KV);

      const settings = await storageService.getGlobalSettings();

      return c.json({
        success: true,
        config: {
          mcpServerUrl: settings.mcpServerUrl,
          mcpEnabled: settings.mcpEnabled,
          mcpTimeout: settings.mcpTimeout,
          mcpRetryAttempts: settings.mcpRetryAttempts
        }
      });

    } catch (error) {
      console.error('獲取 MCP 配置失敗:', error);
      return c.json({
        success: false,
        error: '無法獲取 MCP 配置'
      }, 500);
    }
  });

  // POST /admin/mcp/config - 更新 MCP 配置
  app.post('/mcp/config', authMiddleware(), async (c) => {
    try {
      const { KV, AI } = c.env;
      const storageService = new StorageService(KV);
      const aiService = new AIService(AI);

      const { mcpServerUrl, mcpEnabled, mcpTimeout, mcpRetryAttempts } = await c.req.json();

      // 驗證輸入
      if (mcpServerUrl && typeof mcpServerUrl !== 'string') {
        return c.json({
          success: false,
          error: 'MCP Server URL 必須是字串'
        }, 400);
      }

      if (mcpEnabled !== undefined && typeof mcpEnabled !== 'boolean') {
        return c.json({
          success: false,
          error: 'MCP 啟用狀態必須是布林值'
        }, 400);
      }

      if (mcpTimeout && (typeof mcpTimeout !== 'number' || mcpTimeout < 1000 || mcpTimeout > 60000)) {
        return c.json({
          success: false,
          error: 'MCP 超時時間必須在 1000-60000 毫秒之間'
        }, 400);
      }

      if (mcpRetryAttempts && (typeof mcpRetryAttempts !== 'number' || mcpRetryAttempts < 0 || mcpRetryAttempts > 10)) {
        return c.json({
          success: false,
          error: 'MCP 重試次數必須在 0-10 之間'
        }, 400);
      }

      // 更新設定
      const updateData: any = {};
      if (mcpServerUrl !== undefined) updateData.mcpServerUrl = mcpServerUrl;
      if (mcpEnabled !== undefined) updateData.mcpEnabled = mcpEnabled;
      if (mcpTimeout !== undefined) updateData.mcpTimeout = mcpTimeout;
      if (mcpRetryAttempts !== undefined) updateData.mcpRetryAttempts = mcpRetryAttempts;

      await storageService.updateSettings(updateData);

      // 更新 AI 服務的 MCP 配置
      const newSettings = await storageService.getGlobalSettings();
      aiService.updateMCPConfig(newSettings);

      return c.json({
        success: true,
        message: 'MCP 配置更新成功',
        config: {
          mcpServerUrl: newSettings.mcpServerUrl,
          mcpEnabled: newSettings.mcpEnabled,
          mcpTimeout: newSettings.mcpTimeout,
          mcpRetryAttempts: newSettings.mcpRetryAttempts
        }
      });

    } catch (error) {
      console.error('更新 MCP 配置失敗:', error);
      return c.json({
        success: false,
        error: '無法更新 MCP 配置'
      }, 500);
    }
  });

  return app;
}
