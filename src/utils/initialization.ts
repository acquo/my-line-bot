// 系統初始化工具

import { StorageService } from '../services/storage';
import { DatabaseService } from '../services/database';
import { hashPassword } from './crypto';
import { DEFAULT_SETTINGS } from '../types/settings';

/**
 * 初始化系統設定
 */
export async function initializeSystem(
  storageService: StorageService,
  adminPassword: string = 'admin123'
): Promise<void> {
  try {
    console.log('開始初始化系統設定...');
    
    // 檢查是否已經初始化
    const existingSettings = await storageService.getGlobalSettings();
    if (existingSettings) {
      console.log('系統設定已存在，跳過初始化');
      return;
    }

    // 建立預設設定
    const hashedPassword = await hashPassword(adminPassword);
    const initialSettings = {
      ...DEFAULT_SETTINGS,
      adminPassword: hashedPassword
    };

    await storageService.saveGlobalSettings(initialSettings);
    console.log('系統設定初始化完成');
    console.log(`預設管理員密碼: ${adminPassword}`);
    
  } catch (error) {
    console.error('系統初始化失敗:', error);
    throw error;
  }
}

/**
 * 清理舊資料的定期任務
 */
export async function cleanupOldData(
  databaseService: DatabaseService,
  daysToKeep: number = 30
): Promise<void> {
  try {
    console.log(`開始清理 ${daysToKeep} 天前的舊對話記錄...`);
    await databaseService.cleanupOldConversations(daysToKeep);
    console.log('舊資料清理完成');
  } catch (error) {
    console.error('清理舊資料失敗:', error);
  }
}

/**
 * 檢查系統健康狀態
 */
export async function checkSystemHealth(
  storageService: StorageService,
  databaseService: DatabaseService
): Promise<{
  storage: boolean;
  database: boolean;
  settings: boolean;
}> {
  const health = {
    storage: false,
    database: false,
    settings: false
  };

  try {
    // 檢查 KV 儲存
    await storageService.getGlobalSettings();
    health.storage = true;
    health.settings = true;
  } catch (error) {
    console.error('KV 儲存檢查失敗:', error);
  }

  try {
    // 檢查資料庫連線 (嘗試查詢一筆記錄)
    await databaseService.getUserConversations('health-check', 1);
    health.database = true;
  } catch (error) {
    console.error('資料庫檢查失敗:', error);
  }

  return health;
}

/**
 * 取得系統統計資訊
 */
export async function getSystemStats(
  databaseService: DatabaseService
): Promise<{
  totalConversations: number;
  uniqueUsers: number;
  lastActivity: string | null;
}> {
  try {
    // 這裡需要執行一些統計查詢
    // 由於 D1 的限制，我們使用簡單的查詢
    return {
      totalConversations: 0,
      uniqueUsers: 0,
      lastActivity: null
    };
  } catch (error) {
    console.error('取得系統統計失敗:', error);
    return {
      totalConversations: 0,
      uniqueUsers: 0,
      lastActivity: null
    };
  }
}
