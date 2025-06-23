# LINE Bot Trace 調試功能

## 功能概述

新增的 Trace 功能提供了一個完整的 Webhook 事件追蹤和調試系統，幫助開發者監控和排查 LINE Bot 接收到的訊息處理情況。

## 主要功能

### 1. 事件記錄
- 自動記錄所有 LINE Webhook 事件
- 儲存用戶 ID、事件類型、訊息內容和完整的事件資料
- 按時間倒序排列，最新事件在最上方

### 2. 管理後台界面
- 新增專用的 Trace 頁面 (`/admin/trace.html`)
- 表格形式展示最新的 10 筆事件記錄
- 支援查看事件詳細資訊的模態框
- 即時重新整理功能

### 3. 安全性
- 需要管理員認證才能訪問
- 使用 JWT Token 驗證
- 與現有的管理後台認證系統整合

## 技術實現

### 資料庫結構
```sql
CREATE TABLE webhook_traces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  event_type TEXT NOT NULL,
  message_content TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  raw_event TEXT -- 儲存完整的事件 JSON
);
```

### API 端點
- `GET /admin/traces` - 獲取最新的 Webhook 追蹤記錄
- 支援 `limit` 參數控制返回數量（最大 50 筆）

### 前端功能
- 響應式設計，支援桌面和行動裝置
- 使用 Alpine.js 實現互動功能
- Tailwind CSS 提供美觀的界面

## 使用方法

### 1. 訪問 Trace 頁面
1. 登入管理後台 (`/admin/login.html`)
2. 點擊導航欄中的 "Trace" 連結
3. 或直接訪問 `/admin/trace.html`

### 2. 查看事件記錄
- 表格顯示：時間、用戶 ID、事件類型、訊息內容
- 點擊 "詳細" 按鈕查看完整的事件資料
- 使用 "重新整理" 按鈕獲取最新記錄

### 3. 事件類型說明
- `message` - 用戶發送的訊息（綠色標籤）
- `follow` - 用戶加入 Bot 好友（藍色標籤）
- `unfollow` - 用戶取消 Bot 好友（紅色標籤）
- `join` - Bot 加入群組（紫色標籤）
- `leave` - Bot 離開群組（灰色標籤）

## 開發和測試

### 測試端點
提供了測試端點來創建模擬數據：
```bash
curl -X POST http://localhost:8787/test/webhook-trace
```

### 資料庫遷移
執行以下命令來應用新的資料庫結構：
```bash
# 本地開發環境
npm run db:migrate

# 生產環境
npm run db:migrate:prod
```

## 維護和清理

### 自動清理
系統會自動清理 7 天前的舊追蹤記錄，避免資料庫過度膨脹。

### 手動清理
可以通過 DatabaseService 的 `cleanupOldWebhookTraces()` 方法手動清理：
```typescript
await databaseService.cleanupOldWebhookTraces(7); // 保留 7 天
```

## 效能考量

1. **異步處理**: 追蹤記錄的儲存使用異步處理，不影響主要的 Webhook 處理流程
2. **索引優化**: 在 timestamp 和 user_id 欄位上建立索引，提升查詢效能
3. **數量限制**: API 端點限制最多返回 50 筆記錄，避免過度負載
4. **錯誤處理**: 追蹤功能的錯誤不會影響主要的 Bot 功能

## 故障排除

### 常見問題
1. **無法看到追蹤記錄**: 確認資料庫遷移已執行
2. **認證失敗**: 檢查管理員 Token 是否有效
3. **頁面載入失敗**: 確認開發服務器正在運行

### 調試方法
1. 檢查瀏覽器開發者工具的 Console 和 Network 標籤
2. 查看 Wrangler 日誌：`wrangler tail`
3. 使用測試端點驗證功能：`/test/webhook-trace`

## 未來擴展

可能的功能擴展：
1. 事件過濾和搜尋功能
2. 匯出追蹤記錄為 CSV 或 JSON
3. 即時事件通知
4. 更詳細的統計分析
5. 事件重播功能

## 安全注意事項

1. Trace 頁面包含敏感的用戶資料，確保只有授權人員可以訪問
2. 定期清理舊的追蹤記錄，避免儲存過多個人資料
3. 在生產環境中考慮限制追蹤功能的使用範圍
4. 確保符合相關的資料保護法規要求
