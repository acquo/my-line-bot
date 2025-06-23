// 資料庫操作服務

import type { ConversationRecord, DatabaseConversation, WebhookTraceRecord, DatabaseWebhookTrace } from '../types/database';

export class DatabaseService {
  constructor(private db: D1Database) {}

  /**
   * 儲存對話記錄
   */
  async saveConversation(record: ConversationRecord): Promise<void> {
    try {
      await this.db
        .prepare(
          'INSERT INTO conversations (user_id, message_type, content) VALUES (?, ?, ?)'
        )
        .bind(record.user_id, record.message_type, record.content)
        .run();
    } catch (error) {
      console.error('儲存對話記錄失敗:', error);
      throw new Error('無法儲存對話記錄');
    }
  }

  /**
   * 取得用戶對話歷史
   */
  async getUserConversations(
    userId: string, 
    limit: number = 10
  ): Promise<DatabaseConversation[]> {
    try {
      const result = await this.db
        .prepare(
          'SELECT * FROM conversations WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?'
        )
        .bind(userId, limit)
        .all();

      return (result.results as DatabaseConversation[]).reverse(); // 按時間順序排列
    } catch (error) {
      console.error('取得對話歷史失敗:', error);
      return [];
    }
  }

  /**
   * 清理舊的對話記錄
   */
  async cleanupOldConversations(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      await this.db
        .prepare(
          'DELETE FROM conversations WHERE timestamp < ?'
        )
        .bind(cutoffDate.toISOString())
        .run();
    } catch (error) {
      console.error('清理舊對話記錄失敗:', error);
    }
  }

  /**
   * 取得用戶對話統計
   */
  async getUserStats(userId: string): Promise<{ totalMessages: number; lastActivity: string | null }> {
    try {
      const countResult = await this.db
        .prepare('SELECT COUNT(*) as count FROM conversations WHERE user_id = ?')
        .bind(userId)
        .first();

      const lastActivityResult = await this.db
        .prepare('SELECT timestamp FROM conversations WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1')
        .bind(userId)
        .first();

      return {
        totalMessages: (countResult as any)?.count || 0,
        lastActivity: (lastActivityResult as any)?.timestamp || null
      };
    } catch (error) {
      console.error('取得用戶統計失敗:', error);
      return { totalMessages: 0, lastActivity: null };
    }
  }

  /**
   * 儲存 Webhook 追蹤記錄
   */
  async saveWebhookTrace(record: WebhookTraceRecord): Promise<void> {
    try {
      await this.db
        .prepare(
          'INSERT INTO webhook_traces (user_id, event_type, message_content, raw_event) VALUES (?, ?, ?, ?)'
        )
        .bind(record.user_id || null, record.event_type, record.message_content || null, record.raw_event || null)
        .run();
    } catch (error) {
      console.error('儲存 Webhook 追蹤記錄失敗:', error);
      // 不拋出錯誤，避免影響主要功能
    }
  }

  /**
   * 取得最新的 Webhook 追蹤記錄
   */
  async getRecentWebhookTraces(limit: number = 10): Promise<DatabaseWebhookTrace[]> {
    try {
      const result = await this.db
        .prepare(
          'SELECT * FROM webhook_traces ORDER BY timestamp DESC LIMIT ?'
        )
        .bind(limit)
        .all();

      return result.results as DatabaseWebhookTrace[];
    } catch (error) {
      console.error('取得 Webhook 追蹤記錄失敗:', error);
      return [];
    }
  }

  /**
   * 清理舊的 Webhook 追蹤記錄
   */
  async cleanupOldWebhookTraces(daysToKeep: number = 7): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      await this.db
        .prepare(
          'DELETE FROM webhook_traces WHERE timestamp < ?'
        )
        .bind(cutoffDate.toISOString())
        .run();
    } catch (error) {
      console.error('清理舊 Webhook 追蹤記錄失敗:', error);
    }
  }
}
