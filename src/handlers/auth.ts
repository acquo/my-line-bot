// 認證處理器和中介軟體

import { Hono } from 'hono';
import type { AdminLoginRequest, AdminLoginResponse } from '../types/settings';
import { StorageService } from '../services/storage';
import { verifyPassword, generateToken, verifyToken } from '../utils/crypto';
import { AUTH } from '../utils/constants';

export function createAuthHandler() {
  const app = new Hono<{ Bindings: CloudflareBindings }>();

  // POST /auth/login - 管理員登入
  app.post('/login', async (c) => {
    try {
      const { KV } = c.env;
      const storageService = new StorageService(KV);

      const loginData: AdminLoginRequest = await c.req.json();
      
      if (!loginData.password) {
        return c.json({
          success: false,
          message: '請輸入密碼'
        } as AdminLoginResponse, 400);
      }

      // 取得系統設定
      const settings = await storageService.getGlobalSettings();
      
      // 驗證密碼
      const isValidPassword = await verifyPassword(loginData.password, settings.adminPassword);
      
      if (!isValidPassword) {
        return c.json({
          success: false,
          message: '密碼錯誤'
        } as AdminLoginResponse, 401);
      }

      // 生成 JWT token
      const token = generateToken(
        { role: 'admin', timestamp: Date.now() },
        AUTH.JWT_SECRET
      );

      return c.json({
        success: true,
        token,
        message: '登入成功'
      } as AdminLoginResponse);

    } catch (error) {
      console.error('登入失敗:', error);
      return c.json({
        success: false,
        message: '登入過程發生錯誤'
      } as AdminLoginResponse, 500);
    }
  });

  // POST /auth/verify - 驗證 token
  app.post('/verify', async (c) => {
    try {
      const authHeader = c.req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ valid: false, message: '缺少認證 token' }, 401);
      }

      const token = authHeader.substring(7);
      const payload = verifyToken(token, AUTH.JWT_SECRET);

      if (!payload) {
        return c.json({ valid: false, message: 'Token 無效或已過期' }, 401);
      }

      return c.json({ 
        valid: true, 
        payload,
        message: 'Token 有效'
      });

    } catch (error) {
      console.error('Token 驗證失敗:', error);
      return c.json({ 
        valid: false, 
        message: 'Token 驗證過程發生錯誤' 
      }, 500);
    }
  });

  return app;
}

/**
 * 認證中介軟體
 */
export function authMiddleware() {
  return async (c: any, next: any) => {
    try {
      const authHeader = c.req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: '需要認證' }, 401);
      }

      const token = authHeader.substring(7);
      const payload = verifyToken(token, AUTH.JWT_SECRET);

      if (!payload) {
        return c.json({ error: 'Token 無效或已過期' }, 401);
      }

      // 將用戶資訊加入到 context
      c.set('user', payload);
      
      await next();
    } catch (error) {
      console.error('認證中介軟體錯誤:', error);
      return c.json({ error: '認證過程發生錯誤' }, 500);
    }
  };
}
