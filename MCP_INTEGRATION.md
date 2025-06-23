# MCP (Model Context Protocol) 整合功能

## 功能概述

本專案已成功整合 MCP (Model Context Protocol) Server 功能，使用 Server-Sent Events (SSE) 協議與指定的 MCP Server 進行通訊，為 LINE Bot 提供增強的上下文感知能力。

## 🎯 主要功能

### 1. MCP 服務模組 (`src/services/mcp.ts`)
- **SSE 連接管理**: 建立和維護與 MCP Server 的 SSE 連接
- **會話管理**: 自動處理 sessionId 和端點資訊
- **錯誤處理**: 完整的錯誤處理和重試機制
- **統計追蹤**: 連接統計和效能監控

### 2. AI 服務整合 (`src/services/ai.ts`)
- **上下文增強**: 自動從 MCP Server 獲取相關上下文
- **智能提示詞**: 將 MCP 上下文整合到 AI 提示詞中
- **無縫整合**: 不影響現有 AI 對話流程的前提下增強功能

### 3. 管理後台監控 (`/admin/mcp.html`)
- **連接狀態監控**: 即時顯示 MCP 連接狀態
- **統計資訊**: 連接數、訊息數、錯誤數等統計
- **手動控制**: 連接、斷開、測試功能
- **詳細資訊**: 會話資訊、錯誤日誌、測試結果

## 🔧 技術實現

### MCP Server 端點
```
https://kjsgmiyoejvu.ap-northeast-1.clawcloudrun.com/sse
```

### 核心類別和方法

#### MCPService 類
```typescript
class MCPService {
  async connect(): Promise<MCPSession>
  async sendRequest(request: MCPRequest): Promise<MCPResponse>
  async getContext(query: string): Promise<MCPContext[]>
  disconnect(): void
  getConnectionStatus(): MCPConnectionStatus
  getStats(): MCPStats
}
```

#### AIService 整合
```typescript
class AIService {
  async generateResponse(userMessage, history, settings): Promise<string>
  getMCPConnectionStatus(): MCPConnectionStatus
  getMCPStats(): MCPStats
  async connectToMCP(): Promise<boolean>
  disconnectMCP(): void
  async testMCP(query): Promise<TestResult>
}
```

### API 端點

#### 管理 API
- `GET /admin/mcp/status` - 獲取 MCP 連接狀態和統計
- `POST /admin/mcp/connect` - 手動連接 MCP Server
- `POST /admin/mcp/disconnect` - 斷開 MCP 連接
- `POST /admin/mcp/test` - 測試 MCP 功能

#### 測試 API
- `POST /test/mcp` - 測試 MCP 基本功能
- `POST /test/mcp-ai` - 測試 MCP 整合的 AI 回應

## 🚀 使用方式

### 1. 自動整合
MCP 功能會在 AI 生成回應時自動啟用：
1. 用戶發送訊息到 LINE Bot
2. 系統自動連接到 MCP Server
3. 根據用戶訊息獲取相關上下文
4. 將上下文整合到 AI 提示詞中
5. 生成增強的 AI 回應

### 2. 管理後台監控
1. 訪問 `/admin/mcp.html`
2. 查看連接狀態和統計資訊
3. 手動控制連接和測試功能
4. 監控系統運行狀況

### 3. 測試功能
```bash
# 測試 MCP 基本功能
curl -X POST https://your-worker.workers.dev/test/mcp \
  -H "Content-Type: application/json" \
  -d '{"query":"test query"}'

# 測試 MCP 整合的 AI 回應
curl -X POST https://your-worker.workers.dev/test/mcp-ai \
  -H "Content-Type: application/json" \
  -d '{"message":"測試 MCP 整合功能"}'
```

## 📊 型別定義

### 核心型別 (`src/types/mcp.ts`)
- `MCPSession` - MCP 會話資訊
- `MCPConnectionStatus` - 連接狀態
- `MCPContext` - 上下文資訊
- `MCPRequest/MCPResponse` - 請求/回應格式
- `MCPStats` - 統計資訊

### 配置選項
```typescript
interface MCPServiceConfig {
  serverUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
}
```

## 🔒 安全考量

1. **連接安全**: 使用 HTTPS 連接到 MCP Server
2. **認證控制**: 管理後台需要管理員認證
3. **錯誤隔離**: MCP 錯誤不會影響主要 Bot 功能
4. **資源管理**: 自動斷開閒置連接，避免資源洩漏

## ⚡ 效能最佳化

1. **異步處理**: MCP 請求不阻塞主要對話流程
2. **連接復用**: 重複使用現有連接，減少建立成本
3. **超時控制**: 設定合理的超時時間，避免長時間等待
4. **錯誤恢復**: 自動重試機制，提高可靠性

## 🐛 故障排除

### 常見問題
1. **連接失敗**: 檢查 MCP Server 端點是否可訪問
2. **超時錯誤**: 調整 timeout 設定
3. **認證失敗**: 確認管理員 token 有效
4. **上下文為空**: 檢查查詢參數和 MCP Server 回應

### 調試方法
1. 查看瀏覽器開發者工具的 Console
2. 使用管理後台的測試功能
3. 檢查 Cloudflare Workers 日誌
4. 使用測試 API 端點驗證功能

## 🔮 未來擴展

### 可能的功能增強
1. **多 MCP Server 支援**: 連接多個 MCP Server
2. **快取機制**: 快取常用的上下文資訊
3. **智能路由**: 根據查詢類型選擇最適合的 MCP Server
4. **批次處理**: 批次處理多個上下文請求
5. **即時通知**: MCP Server 狀態變更通知

### 整合可能性
1. **Webhook 整合**: 接收 MCP Server 的 Webhook 通知
2. **資料庫儲存**: 儲存常用的上下文資訊
3. **分析功能**: 分析 MCP 使用模式和效果
4. **自動調優**: 根據使用情況自動調整參數

## 📈 監控指標

### 關鍵指標
- 連接成功率
- 平均回應時間
- 錯誤率
- 上下文獲取成功率
- 會話持續時間

### 告警條件
- 連接失敗率 > 10%
- 平均回應時間 > 5 秒
- 錯誤率 > 5%
- 連續 3 次連接失敗

## 🎉 總結

MCP 整合功能為 LINE Bot 提供了強大的上下文感知能力，通過與外部 MCP Server 的整合，Bot 可以獲取更豐富的資訊來生成更準確和有用的回應。

**主要優勢**:
- ✅ 無縫整合，不影響現有功能
- ✅ 完整的監控和管理界面
- ✅ 強大的錯誤處理和恢復機制
- ✅ 高效的 SSE 通訊協議
- ✅ 靈活的配置和擴展性

這個整合為 LINE Bot 開啟了更多可能性，使其能夠提供更智能和上下文相關的服務。
