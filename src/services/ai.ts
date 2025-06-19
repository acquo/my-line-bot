// AI 服務

import type { AIMessage, AIRequest, AIResponse, DatabaseConversation } from '../types/database';
import type { GlobalSettings } from '../types/settings';
import { AI_CONFIG } from '../utils/constants';

export class AIService {
  constructor(private ai: Ai) {}

  /**
   * 生成 AI 回應
   */
  async generateResponse(
    userMessage: string,
    conversationHistory: DatabaseConversation[],
    settings: GlobalSettings
  ): Promise<string> {
    try {
      const messages = this.buildMessages(userMessage, conversationHistory, settings);
      
      const aiRequest: AIRequest = {
        messages,
        model: settings.defaultModel,
        max_tokens: AI_CONFIG.MAX_TOKENS,
        temperature: AI_CONFIG.TEMPERATURE
      };

      const response = await this.ai.run(settings.defaultModel, aiRequest);
      
      if (!response || !response.response) {
        throw new Error('AI 服務沒有回應');
      }

      return response.response.trim();
    } catch (error) {
      console.error('AI 生成回應失敗:', error);
      return '抱歉，我現在無法回應您的訊息。請稍後再試。';
    }
  }

  /**
   * 建構 AI 訊息陣列
   */
  private buildMessages(
    userMessage: string,
    conversationHistory: DatabaseConversation[],
    settings: GlobalSettings
  ): AIMessage[] {
    const messages: AIMessage[] = [];

    // 加入系統提示詞
    messages.push({
      role: 'system',
      content: settings.systemPrompt
    });

    // 加入對話歷史 (限制數量)
    const recentHistory = conversationHistory.slice(-settings.maxHistoryLength);
    for (const record of recentHistory) {
      messages.push({
        role: record.message_type === 'user' ? 'user' : 'assistant',
        content: record.content
      });
    }

    // 加入當前用戶訊息
    messages.push({
      role: 'user',
      content: userMessage
    });

    return messages;
  }

  /**
   * 檢查訊息是否適當 (基礎內容過濾)
   */
  isMessageAppropriate(message: string): boolean {
    // 基礎的內容過濾
    const inappropriatePatterns = [
      /暴力/i,
      /色情/i,
      /仇恨/i,
      // 可以根據需要添加更多過濾規則
    ];

    return !inappropriatePatterns.some(pattern => pattern.test(message));
  }

  /**
   * 限制回應長度
   */
  truncateResponse(response: string, maxLength: number = 1000): string {
    if (response.length <= maxLength) {
      return response;
    }

    // 在適當的位置截斷 (避免截斷到句子中間)
    const truncated = response.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('。');
    const lastExclamation = truncated.lastIndexOf('！');
    const lastQuestion = truncated.lastIndexOf('？');
    
    const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
    
    if (lastSentenceEnd > maxLength * 0.8) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }
    
    return truncated + '...';
  }
}
