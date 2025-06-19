// KV 儲存服務

import type { GlobalSettings } from '../types/settings';
import { DEFAULT_SETTINGS, KV_KEYS } from '../types/settings';
import { hashPassword } from '../utils/crypto';

export class StorageService {
  constructor(private kv: KVNamespace) {}

  /**
   * 取得全域設定
   */
  async getGlobalSettings(): Promise<GlobalSettings> {
    try {
      const settings = await this.kv.get(KV_KEYS.GLOBAL_SETTINGS, 'json');
      if (!settings) {
        // 如果沒有設定，建立預設設定
        const defaultPassword = await hashPassword('admin123'); // 預設密碼
        const defaultSettings: GlobalSettings = {
          ...DEFAULT_SETTINGS,
          adminPassword: defaultPassword
        };
        await this.saveGlobalSettings(defaultSettings);
        return defaultSettings;
      }
      return settings as GlobalSettings;
    } catch (error) {
      console.error('取得全域設定失敗:', error);
      throw new Error('無法取得系統設定');
    }
  }

  /**
   * 儲存全域設定
   */
  async saveGlobalSettings(settings: GlobalSettings): Promise<void> {
    try {
      await this.kv.put(KV_KEYS.GLOBAL_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('儲存全域設定失敗:', error);
      throw new Error('無法儲存系統設定');
    }
  }

  /**
   * 更新部分設定
   */
  async updateSettings(updates: Partial<Omit<GlobalSettings, 'adminPassword'>>): Promise<GlobalSettings> {
    try {
      const currentSettings = await this.getGlobalSettings();
      const newSettings = { ...currentSettings, ...updates };
      await this.saveGlobalSettings(newSettings);
      return newSettings;
    } catch (error) {
      console.error('更新設定失敗:', error);
      throw new Error('無法更新系統設定');
    }
  }

  /**
   * 更新管理員密碼
   */
  async updateAdminPassword(newPassword: string): Promise<void> {
    try {
      const currentSettings = await this.getGlobalSettings();
      const hashedPassword = await hashPassword(newPassword);
      const newSettings = { ...currentSettings, adminPassword: hashedPassword };
      await this.saveGlobalSettings(newSettings);
    } catch (error) {
      console.error('更新管理員密碼失敗:', error);
      throw new Error('無法更新管理員密碼');
    }
  }

  /**
   * 檢查速率限制
   */
  async checkRateLimit(userId: string, maxRequests: number = 10): Promise<boolean> {
    try {
      const key = KV_KEYS.RATE_LIMIT(userId);
      const current = await this.kv.get(key);
      const count = current ? parseInt(current) : 0;
      
      if (count >= maxRequests) {
        return false; // 超過限制
      }
      
      // 增加計數，設定 1 分鐘過期
      await this.kv.put(key, (count + 1).toString(), { expirationTtl: 60 });
      return true;
    } catch (error) {
      console.error('檢查速率限制失敗:', error);
      return true; // 發生錯誤時允許請求
    }
  }

  /**
   * 重置速率限制
   */
  async resetRateLimit(userId: string): Promise<void> {
    try {
      const key = KV_KEYS.RATE_LIMIT(userId);
      await this.kv.delete(key);
    } catch (error) {
      console.error('重置速率限制失敗:', error);
    }
  }
}
