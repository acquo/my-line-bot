-- 新增 Webhook 事件追蹤表

-- Webhook 事件追蹤表 (用於調試)
CREATE TABLE IF NOT EXISTS webhook_traces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  event_type TEXT NOT NULL,
  message_content TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  raw_event TEXT -- 儲存完整的事件 JSON
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_webhook_traces_timestamp 
ON webhook_traces(timestamp DESC);

-- 建立索引以支援用戶查詢
CREATE INDEX IF NOT EXISTS idx_webhook_traces_user_timestamp 
ON webhook_traces(user_id, timestamp DESC);
