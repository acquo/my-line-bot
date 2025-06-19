import { Hono } from "hono";
import { createWebhookHandler } from "./handlers/webhook";
import { createSetupHandler } from "./handlers/setup";
import { createAuthHandler } from "./handlers/auth";
import { createAdminHandler } from "./handlers/admin";
import { createTestHandler } from "./handlers/test";
import { createAITestHandler } from "./handlers/ai-test";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// 健康檢查端點
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || "unknown"
  });
});

// LINE Webhook 路由
app.route("/webhook", createWebhookHandler());

// 系統設定路由
app.route("/setup", createSetupHandler());

// 認證路由
app.route("/auth", createAuthHandler());

// 管理後台 API 路由
app.route("/admin", createAdminHandler());

// 測試路由 (僅開發環境)
app.route("/test", createTestHandler());

// AI 測試路由 (僅開發環境)
app.route("/ai-test", createAITestHandler());

// 預設路由
app.get("/", (c) => {
  return c.text("LINE Bot is running!");
});

// 保留原有的測試端點
app.get("/message", (c) => {
  return c.text("Hello Hono!");
});

export default app;
