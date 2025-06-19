# LINE Bot 部署指南

## 📋 部署前準備

### 1. LINE Developers 設定

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立新的 Provider 或使用現有的
3. 建立新的 Messaging API Channel
4. 記錄以下資訊：
   - Channel Access Token
   - Channel Secret

### 2. Cloudflare 帳號設定

1. 確保有 Cloudflare 帳號
2. 安裝並登入 Wrangler CLI
3. 確認 Workers AI 功能已啟用

## 🚀 部署步驟

### 1. 建立 Cloudflare 資源

```bash
# 建立 D1 資料庫
wrangler d1 create line-bot-db

# 建立 KV Namespace
wrangler kv:namespace create "LINE_BOT_KV"
```

### 2. 更新 wrangler.toml

將建立的資源 ID 更新到 `wrangler.toml`：

```toml
[env.production]
name = "my-line-bot"
compatibility_date = "2025-06-19"

[[env.production.d1_databases]]
binding = "DB"
database_name = "line-bot-db"
database_id = "YOUR_D1_DATABASE_ID"

[[env.production.kv_namespaces]]
binding = "KV"
id = "YOUR_KV_NAMESPACE_ID"

[env.production.ai]
binding = "AI"

[env.production.vars]
ENVIRONMENT = "production"
```

### 3. 設定環境變數

```bash
# 設定 LINE API 憑證
wrangler secret put LINE_CHANNEL_ACCESS_TOKEN --env production
wrangler secret put LINE_CHANNEL_SECRET --env production
```

### 4. 執行資料庫遷移

```bash
# 生產環境資料庫遷移
npm run db:migrate:prod
```

### 5. 部署應用程式

```bash
# 部署到生產環境
npm run deploy
```

### 6. 設定 LINE Webhook

1. 在 LINE Developers Console 中設定 Webhook URL：
   ```
   https://your-worker-name.your-subdomain.workers.dev/webhook
   ```

2. 啟用 Webhook
3. 測試 Webhook 連線

## ⚙️ 初始化系統

### 1. 系統初始化

部署完成後，訪問以下 URL 初始化系統：

```bash
curl -X POST https://your-worker-name.your-subdomain.workers.dev/setup/init \
  -H "Content-Type: application/json" \
  -d '{"adminPassword":"your-secure-password"}'
```

### 2. 驗證部署

```bash
# 檢查系統健康狀態
curl https://your-worker-name.your-subdomain.workers.dev/setup/health

# 檢查初始化狀態
curl https://your-worker-name.your-subdomain.workers.dev/setup/status
```

## 🔧 管理後台設定

1. 訪問管理後台：
   ```
   https://your-worker-name.your-subdomain.workers.dev/admin/login.html
   ```

2. 使用設定的管理員密碼登入

3. 設定 AI 模型和系統提示詞

## 📱 LINE Bot 測試

1. 在 LINE Developers Console 中取得 QR Code
2. 用 LINE 掃描 QR Code 加入 Bot 為好友
3. 發送測試訊息驗證功能

## 🔍 監控和維護

### 日誌查看

```bash
# 查看 Worker 日誌
wrangler tail --env production
```

### 資料庫管理

```bash
# 連接到生產資料庫
wrangler d1 execute line-bot-db --env production --command "SELECT * FROM conversations LIMIT 10"
```

### 定期維護

建議定期執行以下維護任務：

1. 清理舊的對話記錄
2. 監控 AI 使用量
3. 檢查系統健康狀態
4. 更新系統設定

## 🚨 故障排除

### 常見問題

1. **Webhook 驗證失敗**
   - 檢查 Channel Secret 是否正確
   - 確認 Webhook URL 可以訪問

2. **AI 回應失敗**
   - 檢查 Workers AI 配額
   - 驗證模型可用性

3. **資料庫連接失敗**
   - 確認 D1 資料庫 ID 正確
   - 檢查資料庫遷移是否完成

4. **認證問題**
   - 確認環境變數設定正確
   - 檢查 KV Namespace 配置

### 支援資源

- [Cloudflare Workers 文件](https://developers.cloudflare.com/workers/)
- [LINE Messaging API 文件](https://developers.line.biz/en/docs/messaging-api/)
- [Hono 框架文件](https://hono.dev/)

## 📊 效能最佳化

1. **快取策略**
   - 系統設定快取 1 小時
   - 對話歷史快取 30 分鐘

2. **資料庫最佳化**
   - 定期清理舊資料
   - 適當的索引設計

3. **AI 使用最佳化**
   - 限制對話歷史長度
   - 設定合理的回應長度限制
