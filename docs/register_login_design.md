# 註冊/登入設計說明（方案 B：JSON NoSQL + 角色管理）

本文件定義跨瀏覽器/跨裝置可用的帳密註冊與登入機制，並支援管理者調整使用者角色（客戶 / 開發者 / 管理者）。  
此設計以「JSON NoSQL + 角色控管」為核心。

## 1. 設計目標

- 跨瀏覽器/跨裝置登入（不依賴 localStorage）
- 帳號/Email/密碼註冊與登入
- 管理者可調整使用者角色
- 先以 JSON 儲存，未來可再升級為資料庫

## 2. 架構概覽

- 前端：`/auth` 提供註冊/登入 UI
- 後端：Fastify + TypeScript（Auth API、Admin API）
- 儲存：JSON 檔案（例如 `server/data/users.json` + `server/data/audit_logs.json`）
- Session：JWT 或 httpOnly cookie（建議 cookie）

## 3. JSON 儲存設計

### 3.1 檔案位置

- 預設：
  - `server/data/users.json`
  - `server/data/audit_logs.json`
- 可透過環境變數指定：
  - `DATA_USERS_FILE`
  - `DATA_AUDIT_FILE`
- 若需要舊檔案自動遷移，可設定 `DATA_FILE`（legacy）

> 後端啟動可用 `server/.env.nosqljson.example` 作為範本。

### 3.2 資料格式（分檔）

`users.json`
```json
[
  {
    "id": "uuid",
    "username": "demo_user",
    "email": "demo@example.com",
    "password_hash": "bcrypt_hash",
    "role": "customer",
    "status": "active",
    "created_at": "2026-01-23T10:00:00Z",
    "updated_at": "2026-01-23T10:00:00Z"
  }
]
```

`audit_logs.json`
```json
[
  {
    "id": "uuid",
    "actor_id": "admin_id",
    "target_user_id": "user_id",
    "action": "ROLE_CHANGED",
    "before": { "role": "customer" },
    "after": { "role": "developer" },
    "created_at": "2026-01-23T10:30:00Z"
  }
]
```

> 密碼僅保存 `password_hash`，不可儲存明文。

### 3.3 寫入策略（避免破壞）

- 寫入採「先寫暫存檔，再 rename」的原子更新
- 以「單一程序鎖」避免同時寫入造成覆蓋
- 若未來併發增加，建議升級至正式資料庫

## 4. 註冊流程（後端）

1) 前端送出 `username/email/password/confirm`  
2) 後端檢查：
   - username/email 唯一
   - Email 格式與密碼強度
3) 密碼使用 `bcrypt` 雜湊後寫入 JSON  
4) 回傳成功（可自動登入或要求驗證）

## 5. 登入流程（後端）

1) 輸入 `username` 或 `email` + `password`
2) 查詢 JSON 並比對 hash
3) 發放 JWT 或設定 httpOnly cookie
4) 回傳使用者資訊（含 role）

## 6. 角色管理流程（Admin）

管理者可在後台或 API 進行角色調整：

- `PATCH /admin/users/:id/role`
  - payload: `{ role: "customer" | "developer" | "admin" }`
  - 寫入 `audit_logs`

## 7. 前端驗證規則

- 帳號：3-20 字英數或底線
- Email：基本格式檢查
- 密碼：至少 8 碼
- 帳號/Email 重複 → 顯示錯誤

> 真正的唯一性由後端保證，前端只做 UX 提示。

## 8. API 設計（建議）

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Admin

- `GET /admin/users`
- `PATCH /admin/users/:id/role`
- `PATCH /admin/users/:id/status`

## 9. 安全建議

- 密碼以 `bcrypt` 雜湊
- 登入錯誤次數限制（rate limit）
- 強制使用 HTTPS
- Session cookie 設定 `httpOnly` + `SameSite=Lax`
- Email 驗證與重設密碼流程（可後續加入）

## 10. 與 Firebase 手機登入共存（選擇性）

若未來需要保留手機登入：

- 擴充 `users` 內的 `providers` 欄位，或新增獨立 JSON 區段
- 手機登入成功後，綁定至 `users` 主表
- 角色仍由 `users.role` 控制

## 11. 後續實作清單

1) 後端 Auth API + JSON 儲存  
2) 前端 `/auth` 改為呼叫 API  
3) 建立管理者後台（使用者列表 + 角色調整）  
4) 若使用量增加，升級至 PostgreSQL 或其他資料庫  

## 12. 已落地實作（目前專案）

- 後端：Fastify + JSON 儲存，API 已提供 `/auth` 與 `/admin` 基本功能
- 前端：`/auth` 已改為呼叫後端 API，移除 localStorage 模式
