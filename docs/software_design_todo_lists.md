# Software Design TODO List

依據 `docs/requirement/software_design.md` 彙整的待辦清單，分為里程碑與模組拆解，方便逐步落地。

## 里程碑（建議順序）
- [x] M0：基礎建置與資料層策略（採用 JSON store）
- [x] M1：需求對齊流程可用（提交需求 -> 需求文件 -> 簽核）
- [x] M2：文件中心與版本控管可用（需求/系統/軟體/測試文件）
- [x] M3：媒合與估工可用（媒合評估 -> 團隊指派）
- [x] M4：協作開發可用（任務拆解/里程碑/狀態流）
- [x] M5：品質交付可用（測試文件/AI 審查/品質報告）
- [x] M6：管理與稽核完整（RBAC、稽核、觀測）

## 平台層級待辦
### 1) 資料層與模型
- [x] 決定持久化方案（JSON store 延續或接 Prisma/Postgres）
- [x] 建立核心資料模型
  - Requirement / RequirementDocument
  - Project / Task / Milestone
  - MatchingResult
  - QualityReport / TestDocument
  - AIJob
  - User / Role / AuditLog
- [x] 文件版本存放路徑規則：`projects/{project_id}/{doc_type}/v{version}.md`
- [x] AuditLog 寫入與查詢接口

### 2) 後端 API
- [ ] 通用規範：分頁、錯誤格式、冪等、檔案上傳
- [x] 需求管理 API
  - `POST /api/requirements`
  - `POST /api/requirements/{id}/approve`
  - `GET /api/requirements/{id}/documents`
- [x] 媒合與估工 API
  - `POST /api/matching/evaluate`
  - `POST /api/matching/{id}/assign`
- [x] 專案與文件 API
  - `POST /api/projects`
  - `POST /api/projects/{id}/documents`
  - `GET /api/projects/{id}/documents/{doc_id}`
- [x] 品質與測試 API
  - `POST /api/testing/generate`
  - `POST /api/review/code`
  - `GET /api/quality/reports/{id}`
- [x] 管理與稽核 API
  - `GET /api/audit/logs`

### 3) 權限與安全
- [ ] RBAC 權限模型與角色隔離（customer / developer / admin）
- [ ] 專案層級資料隔離
- [x] 重要操作稽核（文件、狀態、角色、審核）
- [ ] 錯誤格式統一（`code`, `message`, `trace_id`）

### 4) AI 協作層
- [ ] AI 任務調度（同步/非同步）
- [ ] 提示模板管理與版本化
- [ ] AI 產出結果人工覆核流程
- [ ] 任務狀態追蹤（queued/running/succeeded/failed/canceled）

### 5) 觀測與維運
- [ ] API Log、狀態異動 Log
- [ ] 任務成功率/延遲監控
- [ ] 告警條件（AI 任務失敗、流程卡關）

### 6) 通知與即時更新
- [x] 評估即時通知方案（SSE vs WebSocket）
  - SSE 優點：實作成本低、適合單向事件推送、HTTP/2 友善、易於除錯；缺點：只能單向、頻繁雙向互動需另開 API。
  - WebSocket 優點：雙向即時互動、可支援聊天室/協作；缺點：連線維運成本高、需處理斷線重連與擴充策略。
  - 建議：若以「通知推播」為主先用 SSE；若未來需要即時協作/聊天，再升級或並用 WebSocket。
- [x] WebSocket 訊息通知（未讀數量即時更新）

## 前端待辦（頁面與功能）
### 1) 需求提交流程
- [ ] 表單欄位對齊設計稿（專案名稱、背景、目標、範圍、限制、預算、時程、聯絡資訊、附件）
- [ ] 表單檢核（必填、格式、時間區間）
- [x] 提交後產生需求文件與狀態

### 2) 文件中心
- [x] 文件列表（需求/系統/軟體/測試/交付）
- [x] 版本切換、狀態顯示
- [x] 版本比較（差異預覽）

### 3) 里程碑與任務視圖
- [ ] 里程碑列表與進度條
- [x] 任務看板（待處理/進行中/審查/完成）
- [ ] 事件紀錄（需求異動、簽核結果）

### 4) 管理者監控
- [x] 媒合評估卡片與評分
- [x] 品質報告清單
- [x] 使用者/權限管理（角色指派）

## 流程與狀態機
- [x] Requirement 狀態機：draft -> submitted -> under_review -> approved -> matched -> converted
- [x] Document 狀態機：draft -> pending_approval -> approved -> archived
- [x] Project 狀態機：intake -> requirements_signed -> architecture_review -> system_architecture_signed -> software_design_review -> software_design_signed -> quotation_review -> quotation_signed -> implementation -> system_verification_review -> system_verification_signed -> delivery_review -> delivery_signed -> closed（可跨階段 on_hold / canceled）
- [ ] AIJob 狀態機：queued -> running -> succeeded | failed | canceled

## 文件與交付
- [ ] 文件版本規則與更新說明
- [ ] 文件簽核流程與紀錄
- [ ] 交付文件彙整與版本記錄
