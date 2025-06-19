// LINE API 服務

import type { LineReplyRequest, LineApiResponse } from '../types/line';
import { LINE_API } from '../utils/constants';

export class LineService {
  constructor(private accessToken: string) {}

  /**
   * 回覆訊息給 LINE 用戶
   */
  async replyMessage(replyToken: string, message: string): Promise<LineApiResponse> {
    try {
      const replyData: LineReplyRequest = {
        replyToken,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      };

      const response = await fetch(`${LINE_API.BASE_URL}${LINE_API.REPLY_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(replyData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LINE Reply API 錯誤:', response.status, errorText);
        throw new Error(`LINE Reply API 錯誤: ${response.status}`);
      }

      const result = await response.json();
      return result as LineApiResponse;
    } catch (error) {
      console.error('回覆訊息失敗:', error);
      throw new Error('無法回覆訊息');
    }
  }



  /**
   * 驗證 LINE webhook URL (用於設定 webhook 時的驗證)
   */
  static validateWebhook(): Response {
    return new Response('OK', { status: 200 });
  }

  /**
   * 取得用戶資料 (如果需要的話)
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const response = await fetch(`${LINE_API.BASE_URL}/profile/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`無法取得用戶資料: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('取得用戶資料失敗:', error);
      return null;
    }
  }
}
