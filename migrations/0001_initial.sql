-- 初始化資料庫結構

-- 對話歷史表
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_conversations_user_timestamp 
ON conversations(user_id, timestamp DESC);

-- 建立索引以支援清理舊資料
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp
ON conversations(timestamp);
