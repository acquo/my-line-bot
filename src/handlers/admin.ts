// 管理後台 API 處理器

import { Hono } from 'hono';
import { StorageService } from '../services/storage';
import { DatabaseService } from '../services/database';
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

  return app;
}
