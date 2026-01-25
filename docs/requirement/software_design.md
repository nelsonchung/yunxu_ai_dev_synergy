# 軟體設計文件（Software Design）

## 1. 文件目的
本文件依據 `docs/requirement/system_architecture.md`，描述「鋆旭 AI-Dev 軟體系統媒合平台」的軟體設計，涵蓋模組責任、介面、資料模型與流程設計，確保需求可追溯且可實作。

## 2. 範圍與設計邊界
- 平台以 Web 為主要介面，支援客戶、合作團隊與管理者的角色流程。
- 核心交付為需求、設計、測試與交付文件的生產與追蹤。
- AI 能力透過統一協作層整合，不直接暴露在 UI 端。

## 3. 設計原則
- 與 CMMI 流程對齊：需求、規劃、開發、測試、交付皆可追蹤。
- 模組化與可擴充：功能以服務與模組切分，便於後續增修。
- 可追溯與可審計：文件版本、簽核、AI 產出保留歷程。
- 安全與權限：以 RBAC 控制角色與資料隔離。
- 狀態驅動：各流程節點以狀態機管理，避免流程跳步。

## 4. 系統分層與模組責任
### 4.1 Web Frontend
- 公開頁面：產品介紹、流程說明、需求提交與合作申請入口。
- 客戶工作台：需求提交、需求文件簽核、里程碑與交付追蹤。
- 團隊工作台：需求分析、文件編輯、任務追蹤與品質報告檢視。
- 管理者後台：媒合與審核、使用者與權限、流程與品質監控。

### 4.2 Backend API
- Requirement Service：需求收集、文件化、簽核、狀態管理。
- Matching Service：技術/預算/時程三軸匹配、團隊推薦、審核流程。
- Project & Document Service：文件版本控管、存取權限、交付包彙整。
- Collaboration Service：任務拆解、里程碑、活動紀錄與通知。
- Quality & Review Service：測試文件生成、AI Code Review、品質報告。
- Admin Service：角色與權限、審計、系統設定與指標。

### 4.3 Data Layer
- Relational DB：需求、專案、文件索引、任務、使用者、權限。
- Object Storage：文件、附件與輸出報告檔案。
- Audit Log Store：簽核、狀態變更、AI 產出與人工覆核紀錄。

### 4.4 AI Orchestrator
- AI 任務調度：同步/非同步任務分派與結果回寫。
- 模板與審核：提示模板管理、結果版本化與人工覆核。

## 5. UI 設計與主要頁面
### 5.1 需求提交流程
- 分步式表單：基本資訊 -> 需求描述 -> 約束條件 -> 確認提交。
- 主要欄位：專案名稱、背景、目標、功能範圍、非功能需求、預算區間、時程、聯絡資訊、附件。
- 表單檢核：必填欄位、附件格式與大小、時間區間合理性。

### 5.2 文件中心
- 文件列表：需求、系統開發、軟體設計、測試與交付文件。
- 版本切換：顯示版本號、最後更新者、更新時間與簽核狀態。
- 版本比較：同一文件不同版本差異預覽。

### 5.3 里程碑與任務視圖
- 里程碑列表與狀態進度條。
- 任務看板：待處理、進行中、審查、完成。
- 事件紀錄：需求異動、文件更新、簽核結果。

### 5.4 管理者監控
- 媒合評估卡片：技術/預算/時程評分。
- 品質報告清單：AI 與人工審查結果摘要。
- 使用者與權限管理：角色設定與專案指派。

## 6. API 設計（詳細）
### 6.1 通用規範
- 認證：Bearer Token。
- 分頁：`page`、`page_size`、`sort`。
- 錯誤格式：`{ code, message, trace_id }`。
- 文件上傳：`multipart/form-data`，附件統一走 Object Storage。
- 冪等性：建立類 API 支援 `Idempotency-Key`。

### 6.2 需求管理 API
`POST /api/requirements`
- Request: `title`, `background`, `goals`, `scope`, `constraints`, `budget_range`, `timeline`, `contact`, `attachments[]`
- Response: `id`, `status`, `document_id`

`POST /api/requirements/{id}/approve`
- Request: `approved` (bool), `comment`
- Response: `status`, `approved_at`

`GET /api/requirements/{id}/documents`
- Response: `documents[]` with `version`, `status`, `updated_at`

### 6.3 媒合與估工 API
`POST /api/matching/evaluate`
- Request: `requirement_id`
- Response: `matching_id`, `score`, `budget_estimate`, `timeline_estimate`

`POST /api/matching/{id}/assign`
- Request: `team_id`
- Response: `status`

### 6.4 專案與文件 API
`POST /api/projects`
- Request: `requirement_id`, `name`
- Response: `project_id`, `status`

`POST /api/projects/{id}/documents`
- Request: `type`, `content`, `version_note`
- Response: `document_id`, `version`

`GET /api/projects/{id}/documents/{doc_id}`
- Response: `type`, `content`, `version`, `status`

### 6.5 品質與測試 API
`POST /api/testing/generate`
- Request: `project_id`, `scope`
- Response: `job_id`

`POST /api/review/code`
- Request: `project_id`, `repository_url`, `commit_sha`
- Response: `job_id`

`GET /api/quality/reports/{id}`
- Response: `report_url`, `summary`, `status`

### 6.6 管理與稽核 API
`GET /api/audit/logs`
- Query: `actor_id`, `date_from`, `date_to`
- Response: `logs[]`

### 6.7 通知與即時更新 API
`GET /api/notifications`
- Response: `notifications[]`

`GET /api/notifications/unread-count`
- Response: `count`

`POST /api/notifications/{id}/read`
- Response: `ok`

`POST /api/notifications/read-all`
- Response: `updated`

`GET /api/notifications/ws`（WebSocket upgrade）
- 用途：推播「有新通知 / 未讀數量更新」事件，前端收到後再呼叫 REST API 重新抓取。
- 實作備註：目前採用 Node.js `upgrade` + 最小 WebSocket frame 處理（無額外套件），原因是開發環境可能無法連線 npm registry。
- 限制：此實作以通知推播為主，未涵蓋進階協定需求；未來若網路條件允許，建議改用 `@fastify/websocket` 或 `ws`。

## 7. 核心資料模型（詳細）
### 7.1 需求與文件
- Requirement: `id (uuid)`, `title (varchar)`, `background (text)`, `status (enum)`, `owner_id (uuid)`, `created_at`, `updated_at`
- RequirementDocument: `id (uuid)`, `requirement_id (uuid)`, `version (int)`, `content_url`, `status (enum)`, `approved_by (uuid)`

### 7.2 專案與任務
- Project: `id (uuid)`, `requirement_id (uuid)`, `status (enum)`, `start_date`, `end_date`
- Task: `id (uuid)`, `project_id`, `title`, `status (enum)`, `assignee_id`, `due_date`
- Milestone: `id (uuid)`, `project_id`, `title`, `status (enum)`, `due_date`

### 7.3 媒合與評估
- MatchingResult: `id`, `requirement_id`, `team_id`, `score`, `budget`, `timeline`, `status`

### 7.4 品質與測試
- QualityReport: `id`, `project_id`, `type`, `status`, `summary`, `report_url`
- TestDocument: `id`, `project_id`, `version`, `content_url`

### 7.5 AI 任務
- AIJob: `id`, `type`, `target_id`, `status`, `result_url`, `created_at`, `completed_at`

### 7.6 權限與稽核
- User: `id`, `name`, `role`, `status`
- Role: `id`, `name`, `permissions[]`
- AuditLog: `id`, `actor_id`, `action`, `target_id`, `created_at`

## 8. 狀態機與流程設計
### 8.1 Requirement 狀態
- `draft -> submitted -> under_review -> approved -> matched -> converted`
- `under_review -> rejected`（可退回修改）

### 8.2 Document 狀態
- `draft -> pending_approval -> approved -> archived`
- 新版本產生後，舊版本標記為 `archived`

### 8.3 Project 狀態
- `intake -> requirements_signed -> architecture_review -> architecture_signed -> software_design_review -> software_design_signed -> implementation -> system_verification -> delivery_review -> closed`
- 任一進行中階段可轉為 `on_hold` 或 `canceled`

### 8.4 AIJob 狀態
- `queued -> running -> succeeded | failed | canceled`

## 9. 文件與版本控管
- Document 為邏輯主體，DocumentVersion 保存實體內容與版本號。
- 版本規則：主版本遞增，保留更新說明與審核記錄。
- 存放路徑：`projects/{project_id}/{doc_type}/v{version}.md`

## 10. AI 協作設計
- 任務類型：需求摘要、需求拆解、規格草稿、程式碼審查、測試案例生成。
- 執行方式：同步（短任務）與非同步（大量分析/測試）。
- 審核流程：AI 結果必須人工確認後方可進入交付流程。
- 追蹤：AI 產出與最終採用版本需保留關聯。

## 11. 安全性與權限設計
- 驗證：帳號登入與 Token 管理。
- 授權：RBAC，專案層級資料隔離。
- 稽核：所有文件與決策異動需記錄於 AuditLog。
- 下載與檔案：文件存取需權限驗證。

## 12. 錯誤處理與例外
- 統一錯誤格式：`code`, `message`, `trace_id`。
- 代表性錯誤碼：`invalid_input`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `ai_job_failed`。
- 文件版本衝突需提示並保留歷史版本。

## 13. 非功能性需求
- 可追溯：文件版本、簽核紀錄完整。
- 可視化：里程碑與品質報告視覺化。
- 品質控管：AI + 人工雙重驗證。
- 可擴充：模組化設計支援擴充。

## 14. 觀測與維運
- Log：API 請求、狀態異動、AI 任務結果。
- Monitor：服務健康狀態、任務成功率、延遲。
- Alert：AI 任務失敗、流程卡關、文件簽核超時。

## 15. 後續擴充
- 多語系支援。
- 更細緻的品質指標與自動驗收。
- 合作夥伴評分與媒合規則優化。
