// 資料庫相關型別定義

export interface ConversationRecord {
  id?: number;
  user_id: string;
  message_type: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface DatabaseConversation {
  id: number;
  user_id: string;
  message_type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// AI 服務相關型別
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  response: string;
}

export interface AIRequest {
  messages: AIMessage[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
}
