// 系統設定相關型別定義

export interface GlobalSettings {
  defaultModel: string;
  systemPrompt: string;
  maxHistoryLength: number;
  adminPassword: string; // hashed
}

export interface AdminLoginRequest {
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  token?: string;
  message?: string;
}

export interface UpdateSettingsRequest {
  defaultModel?: string;
  systemPrompt?: string;
  maxHistoryLength?: number;
}

// 支援的 AI 模型
export const SUPPORTED_MODELS = {
  'llama-3.1-8b': '@cf/meta/llama-3.1-8b-instruct',
  'llama-3.1-70b': '@cf/meta/llama-3.1-70b-instruct',
  'mistral-7b': '@cf/mistral/mistral-7b-instruct-v0.1'
} as const;

export type SupportedModel = typeof SUPPORTED_MODELS[keyof typeof SUPPORTED_MODELS];

// 預設設定
export const DEFAULT_SETTINGS: Omit<GlobalSettings, 'adminPassword'> = {
  defaultModel: SUPPORTED_MODELS['llama-3.1-8b'],
  systemPrompt: '你是一個友善且樂於助人的 AI 助手。請用繁體中文回應，保持禮貌和專業。',
  maxHistoryLength: 10
};

// KV 儲存鍵
export const KV_KEYS = {
  GLOBAL_SETTINGS: 'global:settings',
  RATE_LIMIT: (userId: string) => `rate:${userId}`
} as const;
