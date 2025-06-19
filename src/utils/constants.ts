// 常數定義

export const LINE_API = {
  BASE_URL: 'https://api.line.me/v2/bot',
  REPLY_ENDPOINT: '/message/reply'
} as const;

export const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 10,
  WINDOW_MS: 60 * 1000 // 1 分鐘
} as const;

export const AI_CONFIG = {
  MAX_TOKENS: 500,
  TEMPERATURE: 0.7,
  DEFAULT_TIMEOUT: 30000 // 30 秒
} as const;

export const AUTH = {
  JWT_SECRET: 'your-jwt-secret-key', // 在生產環境中應該從環境變數讀取
  TOKEN_EXPIRY: '24h'
} as const;

export const DATABASE = {
  MAX_HISTORY_DAYS: 30,
  CLEANUP_INTERVAL_HOURS: 24
} as const;
