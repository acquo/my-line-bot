// 系統設定處理器

import { Hono } from 'hono';
import { StorageService } from '../services/storage';
import { DatabaseService } from '../services/database';
import { initializeSystem, checkSystemHealth, getSystemStats } from '../utils/initialization';

export function createSetupHandler() {
  const app = new Hono<{ Bindings: CloudflareBindings }>();

  // POST /setup/init - 初始化系統
  app.post('/init', async (c) => {
    try {
      const { KV, DB } = c.env;
      const storageService = new StorageService(KV);
      
      // 檢查是否已經初始化
      try {
        const existingSettings = await storageService.getGlobalSettings();
        if (existingSettings) {
          return c.json({ 
            success: false, 
            message: '系統已經初始化過了' 
          }, 400);
        }
      } catch (error) {
        // 如果取得設定失敗，表示還沒初始化，繼續執行
      }

      // 從請求中取得自定義密碼（可選）
      const body = await c.req.json().catch(() => ({}));
      const customPassword = body.adminPassword;

      await initializeSystem(storageService, customPassword);

      return c.json({
        success: true,
        message: '系統初始化完成',
        defaultPassword: customPassword || 'admin123'
      });

    } catch (error) {
      console.error('系統初始化失敗:', error);
      return c.json({
        success: false,
        message: '系統初始化失敗',
        error: error instanceof Error ? error.message : '未知錯誤'
      }, 500);
    }
  });

  // GET /setup/health - 系統健康檢查
  app.get('/health', async (c) => {
    try {
      const { KV, DB } = c.env;
      const storageService = new StorageService(KV);
      const databaseService = new DatabaseService(DB);

      const health = await checkSystemHealth(storageService, databaseService);
      const stats = await getSystemStats(databaseService);

      return c.json({
        health,
        stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('健康檢查失敗:', error);
      return c.json({
        error: '健康檢查失敗',
        timestamp: new Date().toISOString()
      }, 500);
    }
  });

  // GET /setup/status - 檢查初始化狀態
  app.get('/status', async (c) => {
    try {
      const { KV } = c.env;
      const storageService = new StorageService(KV);

      try {
        const settings = await storageService.getGlobalSettings();
        return c.json({
          initialized: true,
          hasSettings: !!settings,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return c.json({
          initialized: false,
          hasSettings: false,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('檢查初始化狀態失敗:', error);
      return c.json({
        error: '無法檢查初始化狀態',
        timestamp: new Date().toISOString()
      }, 500);
    }
  });

  return app;
}
