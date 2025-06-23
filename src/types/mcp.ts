// MCP (Model Context Protocol) 相關型別定義

// SSE 事件型別
export interface MCPSSEEvent {
  event: string;
  data: string;
  id?: string;
  retry?: number;
}

// MCP 會話資訊
export interface MCPSession {
  sessionId: string;
  endpoint: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

// MCP 連接狀態
export interface MCPConnectionStatus {
  isConnected: boolean;
  lastConnected?: Date;
  lastError?: string;
  retryCount: number;
  currentSession?: MCPSession;
}

// MCP 訊息型別
export interface MCPMessage {
  id: string;
  type: 'request' | 'response' | 'notification';
  method?: string;
  params?: any;
  result?: any;
  error?: MCPError;
}

// MCP 錯誤型別
export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// MCP 請求型別
export interface MCPRequest {
  method: string;
  params?: any;
  sessionId?: string;
}

// MCP 回應型別
export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: MCPError;
  sessionId?: string;
}

// MCP 上下文資訊
export interface MCPContext {
  type: 'text' | 'image' | 'file' | 'url';
  content: string;
  metadata?: {
    title?: string;
    description?: string;
    source?: string;
    timestamp?: string;
  };
}

// MCP 服務配置
export interface MCPServiceConfig {
  serverUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
}

// MCP 事件處理器型別
export type MCPEventHandler = (event: MCPSSEEvent) => void | Promise<void>;

// MCP 連接選項
export interface MCPConnectionOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retryOnError?: boolean;
  maxRetries?: number;
}

// MCP 工具定義
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema
}

// MCP 資源定義
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// MCP 提示詞定義
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

// MCP 伺服器能力
export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {};
}

// MCP 初始化請求
export interface MCPInitializeRequest {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

// MCP 初始化回應
export interface MCPInitializeResponse {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}

// MCP 統計資訊
export interface MCPStats {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  totalErrors: number;
  averageResponseTime: number;
  lastActivity?: Date;
}

// MCP 日誌等級
export type MCPLogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

// MCP 日誌項目
export interface MCPLogEntry {
  level: MCPLogLevel;
  logger?: string;
  data: any;
  timestamp: Date;
}

// MCP 通知型別
export interface MCPNotification {
  method: string;
  params?: any;
}

// MCP 進度通知
export interface MCPProgressNotification extends MCPNotification {
  method: 'notifications/progress';
  params: {
    progressToken: string | number;
    progress: number;
    total?: number;
  };
}

// MCP 資源變更通知
export interface MCPResourceChangeNotification extends MCPNotification {
  method: 'notifications/resources/list_changed';
}

// MCP 工具變更通知
export interface MCPToolChangeNotification extends MCPNotification {
  method: 'notifications/tools/list_changed';
}

// MCP 提示詞變更通知
export interface MCPPromptChangeNotification extends MCPNotification {
  method: 'notifications/prompts/list_changed';
}
