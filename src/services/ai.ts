// AI 服務

import type { AIMessage, AIRequest, AIResponse, DatabaseConversation } from '../types/database';
import type { GlobalSettings } from '../types/settings';
import type { MCPContext } from '../types/mcp';
import { AI_CONFIG } from '../utils/constants';
import { MCPService } from './mcp';

export class AIService {
  private mcpService: MCPService;

  constructor(private ai: Ai) {
    this.mcpService = new MCPService();
  }

  /**
   * 更新 MCP 配置
   */
  updateMCPConfig(settings: GlobalSettings): void {
    this.mcpService.updateConfig({
      serverUrl: settings.mcpServerUrl,
      timeout: settings.mcpTimeout,
      retryAttempts: settings.mcpRetryAttempts,
      enableLogging: true
    });
  }

  /**
   * 生成 AI 回應（整合 MCP 上下文）
   */
  async generateResponse(
    userMessage: string,
    conversationHistory: DatabaseConversation[],
    settings: GlobalSettings
  ): Promise<string> {
    try {
      // 嘗試從 MCP Server 獲取相關上下文
      const mcpContext = await this.getMCPContext(userMessage, settings);

      // 建構包含 MCP 上下文的訊息
      const messages = this.buildMessages(userMessage, conversationHistory, settings, mcpContext);

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
   * 從 MCP Server 獲取相關上下文
   */
  private async getMCPContext(userMessage: string, settings: GlobalSettings): Promise<MCPContext[]> {
    try {
      // 檢查是否啟用 MCP
      if (!settings.mcpEnabled) {
        return [];
      }

      // 更新 MCP 配置
      this.updateMCPConfig(settings);

      // 嘗試連接到 MCP Server
      if (!this.mcpService.getConnectionStatus().isConnected) {
        await this.mcpService.connect();
      }

      // 獲取與用戶訊息相關的上下文
      const contexts = await this.mcpService.getContext(userMessage);

      console.log(`從 MCP Server 獲取到 ${contexts.length} 個上下文項目`);
      return contexts;

    } catch (error) {
      console.warn('無法從 MCP Server 獲取上下文:', error);
      return [];
    }
  }

  /**
   * 建構 AI 訊息陣列（包含 MCP 上下文）
   */
  private buildMessages(
    userMessage: string,
    conversationHistory: DatabaseConversation[],
    settings: GlobalSettings,
    mcpContext: MCPContext[] = []
  ): AIMessage[] {
    const messages: AIMessage[] = [];

    // 建構增強的系統提示詞
    let enhancedSystemPrompt = settings.systemPrompt;

    if (mcpContext.length > 0) {
      enhancedSystemPrompt += '\n\n## 相關上下文資訊\n';
      enhancedSystemPrompt += '以下是與用戶問題相關的額外上下文資訊，請參考這些資訊來提供更準確的回應：\n\n';

      mcpContext.forEach((context, index) => {
        enhancedSystemPrompt += `### 上下文 ${index + 1}\n`;
        if (context.metadata?.title) {
          enhancedSystemPrompt += `**標題**: ${context.metadata.title}\n`;
        }
        if (context.metadata?.source) {
          enhancedSystemPrompt += `**來源**: ${context.metadata.source}\n`;
        }
        enhancedSystemPrompt += `**內容**: ${context.content}\n\n`;
      });

      enhancedSystemPrompt += '請基於以上上下文資訊和對話歷史來回應用戶的問題。';
    }

    // 加入增強的系統提示詞
    messages.push({
      role: 'system',
      content: enhancedSystemPrompt
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

  /**
   * 獲取 MCP 連接狀態
   */
  getMCPConnectionStatus() {
    return this.mcpService.getConnectionStatus();
  }

  /**
   * 獲取 MCP 統計資訊
   */
  getMCPStats() {
    return this.mcpService.getStats();
  }

  /**
   * 手動連接到 MCP Server
   */
  async connectToMCP(): Promise<boolean> {
    try {
      await this.mcpService.connect();
      return true;
    } catch (error) {
      console.error('手動連接 MCP Server 失敗:', error);
      return false;
    }
  }

  /**
   * 斷開 MCP 連接
   */
  disconnectMCP(): void {
    this.mcpService.disconnect();
  }

  /**
   * 測試 MCP 功能
   */
  async testMCP(query: string = 'test'): Promise<{ success: boolean; contexts: MCPContext[]; error?: string }> {
    try {
      const contexts = await this.getMCPContext(query);
      return {
        success: true,
        contexts
      };
    } catch (error) {
      return {
        success: false,
        contexts: [],
        error: (error as Error).message
      };
    }
  }
}
