// MCP (Model Context Protocol) 服務

import type {
  MCPSession,
  MCPConnectionStatus,
  MCPServiceConfig,
  MCPSSEEvent,
  MCPRequest,
  MCPResponse,
  MCPContext,
  MCPStats,
  MCPConnectionOptions
} from '../types/mcp';

export class MCPService {
  private config: MCPServiceConfig;
  private connectionStatus: MCPConnectionStatus;
  private currentSession: MCPSession | null = null;
  private stats: MCPStats;
  private abortController: AbortController | null = null;

  constructor(config: Partial<MCPServiceConfig> = {}) {
    this.config = {
      serverUrl: config.serverUrl || 'https://kjsgmiyoejvu.ap-northeast-1.clawcloudrun.com/sse',
      timeout: config.timeout || 30000, // 30 秒
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000, // 1 秒
      enableLogging: config.enableLogging !== undefined ? config.enableLogging : true,
      ...config
    };

    this.connectionStatus = {
      isConnected: false,
      retryCount: 0
    };

    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      totalMessages: 0,
      totalErrors: 0,
      averageResponseTime: 0
    };
  }

  /**
   * 建立 SSE 連接到 MCP Server
   */
  async connect(options: MCPConnectionOptions = {}): Promise<MCPSession> {
    try {
      this.log('info', 'Attempting to connect to MCP server', { url: this.config.serverUrl });

      // 創建新的 AbortController
      this.abortController = new AbortController();

      const response = await fetch(this.config.serverUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...options.headers
        },
        signal: this.abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      // 解析初始 SSE 事件以獲取 session 資訊
      const session = await this.parseInitialSSEResponse(response);
      
      this.currentSession = session;
      this.connectionStatus = {
        isConnected: true,
        lastConnected: new Date(),
        retryCount: 0,
        currentSession: session
      };

      this.stats.totalConnections++;
      this.stats.activeConnections++;

      this.log('info', 'Successfully connected to MCP server', { sessionId: session.sessionId });

      return session;

    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * 解析初始 SSE 回應以獲取會話資訊
   */
  private async parseInitialSSEResponse(response: Response): Promise<MCPSession> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      // 讀取第一個事件
      const { value, done } = await reader.read();
      if (done) {
        throw new Error('No data received from SSE stream');
      }

      buffer += decoder.decode(value, { stream: true });
      const events = this.parseSSEEvents(buffer);

      if (events.length === 0) {
        throw new Error('No valid SSE events received');
      }

      const endpointEvent = events.find(event => event.event === 'endpoint');
      if (!endpointEvent) {
        throw new Error('No endpoint event received');
      }

      // 解析 endpoint 資料以獲取 sessionId
      const endpointData = endpointEvent.data;
      const sessionIdMatch = endpointData.match(/sessionId=([^&]+)/);
      
      if (!sessionIdMatch) {
        throw new Error('No sessionId found in endpoint event');
      }

      const sessionId = sessionIdMatch[1];
      const endpoint = endpointData;

      return {
        sessionId,
        endpoint,
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };

    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 解析 SSE 事件
   */
  private parseSSEEvents(data: string): MCPSSEEvent[] {
    const events: MCPSSEEvent[] = [];
    const lines = data.split('\n');
    let currentEvent: Partial<MCPSSEEvent> = {};

    for (const line of lines) {
      if (line.trim() === '') {
        // 空行表示事件結束
        if (currentEvent.event && currentEvent.data !== undefined) {
          events.push(currentEvent as MCPSSEEvent);
        }
        currentEvent = {};
        continue;
      }

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const field = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      switch (field) {
        case 'event':
          currentEvent.event = value;
          break;
        case 'data':
          currentEvent.data = value;
          break;
        case 'id':
          currentEvent.id = value;
          break;
        case 'retry':
          currentEvent.retry = parseInt(value, 10);
          break;
      }
    }

    return events;
  }

  /**
   * 發送請求到 MCP Server
   */
  async sendRequest(request: MCPRequest): Promise<MCPResponse> {
    if (!this.currentSession) {
      throw new Error('No active MCP session');
    }

    const startTime = Date.now();

    try {
      this.log('debug', 'Sending MCP request', { method: request.method, sessionId: this.currentSession.sessionId });

      // 構建請求 URL
      const url = new URL(this.currentSession.endpoint, this.config.serverUrl);
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          method: request.method,
          params: request.params,
          id: Date.now().toString()
        }),
        signal: this.abortController?.signal
      });

      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      this.log('debug', 'Received MCP response', { responseTime, dataSize: JSON.stringify(data).length });

      return {
        success: true,
        data,
        sessionId: this.currentSession.sessionId
      };

    } catch (error) {
      this.stats.totalErrors++;
      this.log('error', 'MCP request failed', { error: (error as Error).message, method: request.method });
      
      return {
        success: false,
        error: {
          code: -1,
          message: (error as Error).message
        },
        sessionId: this.currentSession.sessionId
      };
    }
  }

  /**
   * 獲取上下文資訊
   */
  async getContext(query: string): Promise<MCPContext[]> {
    try {
      const response = await this.sendRequest({
        method: 'resources/list',
        params: { query }
      });

      if (!response.success || !response.data) {
        return [];
      }

      // 轉換回應為 MCPContext 格式
      const contexts: MCPContext[] = [];
      
      if (Array.isArray(response.data.resources)) {
        for (const resource of response.data.resources) {
          contexts.push({
            type: 'text',
            content: resource.content || resource.description || '',
            metadata: {
              title: resource.name,
              description: resource.description,
              source: resource.uri,
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      return contexts;

    } catch (error) {
      this.log('error', 'Failed to get context', { error: (error as Error).message, query });
      return [];
    }
  }

  /**
   * 斷開連接
   */
  disconnect(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.currentSession) {
      this.currentSession.isActive = false;
      this.currentSession = null;
    }

    this.connectionStatus.isConnected = false;
    this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);

    this.log('info', 'Disconnected from MCP server');
  }

  /**
   * 獲取連接狀態
   */
  getConnectionStatus(): MCPConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * 獲取統計資訊
   */
  getStats(): MCPStats {
    return { ...this.stats };
  }

  /**
   * 處理連接錯誤
   */
  private handleConnectionError(error: Error): void {
    this.connectionStatus.isConnected = false;
    this.connectionStatus.lastError = error.message;
    this.connectionStatus.retryCount++;
    this.stats.totalErrors++;

    this.log('error', 'MCP connection error', { 
      error: error.message, 
      retryCount: this.connectionStatus.retryCount 
    });
  }

  /**
   * 更新統計資訊
   */
  private updateStats(responseTime: number): void {
    this.stats.totalMessages++;
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalMessages - 1) + responseTime) / this.stats.totalMessages;
    this.stats.lastActivity = new Date();
  }

  /**
   * 更新 MCP 服務配置
   */
  updateConfig(newConfig: Partial<MCPServiceConfig>): void {
    // 如果 URL 改變，需要斷開現有連接
    const urlChanged = newConfig.serverUrl && newConfig.serverUrl !== this.config.serverUrl;

    if (urlChanged && this.connectionStatus.isConnected) {
      this.disconnect();
    }

    // 更新配置
    this.config = {
      ...this.config,
      ...newConfig
    };

    this.log('info', 'MCP 配置已更新', { newConfig, urlChanged });
  }

  /**
   * 獲取當前配置
   */
  getConfig(): MCPServiceConfig {
    return { ...this.config };
  }

  /**
   * 日誌記錄
   */
  private log(level: string, message: string, data?: any): void {
    if (!this.config.enableLogging) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'MCP',
      message,
      data
    };

    console.log(`[${logEntry.timestamp}] [${level.toUpperCase()}] [MCP] ${message}`, data || '');
  }
}
