# Autotest 腳本（M0）

此資料夾包含獨立的 shell 腳本，用來驗證 M0 後端行為：
健康檢查、登入/註冊流程、與管理者流程。每個腳本可獨立執行。

## 先決條件
- 後端已啟動並可連線（預設 base URL：`http://localhost:8787`）。
- 已安裝 `curl`。
- 已安裝 `python3`（用於 JSON 解析與斷言）。

## 共用環境變數
- `API_BASE_URL`（選填）：覆寫後端 base URL。
  範例：`API_BASE_URL=http://localhost:8787`

## 腳本說明

### `01_health_check.sh`
用途：
- 確認後端 `/health` 回傳 HTTP 200。
- 斷言 JSON 回應包含 `{"status":"ok"}`。

設計重點：
- 使用 `curl` 取得回應並讀取 HTTP status code。
- 優先以 `python3` 嚴格解析 JSON；沒有則退回 `grep`。
- 不會寫入任何伺服器資料。

### `02_auth_flow.sh`
用途：
- 透過 `/auth/register` 建立唯一帳號。
- 驗證 `/auth/me` 回傳同一位使用者。
- 登出後確認 `/auth/me` 回傳 `null`。
- 再次登入並確認使用者 ID 一致。
- 驗證新使用者已寫入 JSON store。

設計重點：
- 使用時間戳產生唯一 `username`/`email` 避免衝突。
- 以 cookie jar 維持 session。
- 讀取 `server/data/users.json` 驗證落盤。

環境變數：
- `DATA_USERS_FILE`（選填）：users JSON store 路徑。
  預設：`server/data/users.json`

資料影響：
- 會新增一筆使用者到 `server/data/users.json`。

### `03_admin_flow.sh`
用途：
- 以管理者登入。
- 列出使用者清單，確認 admin endpoint 可用。
- 更新新建使用者的角色與狀態。
- 驗證被停用使用者無法登入。
- 重設密碼並驗證可用新密碼登入。
- 驗證 audit log 有記錄角色/狀態/密碼變更。

設計重點：
- 預設可使用腳本內的 `DEFAULT_ADMIN_*`（若有填），也可用環境變數覆寫。
- 每次建立一位新使用者供測試操作。
- 分開使用 admin 與 user 的 cookie jar。
- 讀取 `server/data/audit_logs.json` 驗證記錄。

環境變數：
- `ADMIN_IDENTIFIER`（選填）：admin 帳號或 Email（未提供時使用腳本內 `DEFAULT_ADMIN_IDENTIFIER`）。
- `ADMIN_PASSWORD`（選填）：admin 密碼（未提供時使用腳本內 `DEFAULT_ADMIN_PASSWORD`）。
- `DATA_USERS_FILE`（選填）：users JSON store 路徑。
  預設：`server/data/users.json`
- `DATA_AUDIT_FILE`（選填）：audit log JSON store 路徑。
  預設：`server/data/audit_logs.json`

資料影響：
- 會新增一筆使用者到 `server/data/users.json`。
- 會新增 audit log 到 `server/data/audit_logs.json`。

安全提醒：
- 若要在腳本內填入 `DEFAULT_ADMIN_*`，請避免提交真實或生產環境密碼。

### `04_requirement_flow.sh`
用途：
- 建立需求並產生需求文件版本。
- 查詢需求文件列表與內容。
- 以管理者核准需求並驗證狀態更新。

設計重點：
- 建立需求後會確認文件內容包含專案名稱。
- 以管理者身分建立需求並完成核准流程。
- 讀取 `server/data/requirements.json` 驗證需求落盤。

環境變數：
- `ADMIN_IDENTIFIER`（選填）：admin 帳號或 Email（未提供時使用腳本內 `DEFAULT_ADMIN_IDENTIFIER`）。
- `ADMIN_PASSWORD`（選填）：admin 密碼（未提供時使用腳本內 `DEFAULT_ADMIN_PASSWORD`）。
- `DATA_REQUIREMENTS_FILE`（選填）：requirements JSON store 路徑。
  預設：`server/data/requirements.json`

資料影響：
- 會新增一筆需求到 `server/data/requirements.json`。
- 會新增需求文件版本到資料資料夾。

### `05_project_documents.sh`
用途：
- 建立需求與專案。
- 建立同一文件類型的多版本文件並檢查內容。
- 驗證專案資料落盤。

設計重點：
- 透過同一 `type` 建立 v1/v2 版本，驗證版本控管與內容讀取。
- 讀取 `server/data/projects.json` 驗證專案落盤。
- 以管理者身份建立需求/專案/文件。

環境變數：
- `ADMIN_IDENTIFIER`（選填）：admin 帳號或 Email（未提供時使用腳本內 `DEFAULT_ADMIN_IDENTIFIER`）。
- `ADMIN_PASSWORD`（選填）：admin 密碼（未提供時使用腳本內 `DEFAULT_ADMIN_PASSWORD`）。
- `DATA_PROJECTS_FILE`（選填）：projects JSON store 路徑。
  預設：`server/data/projects.json`

### `06_delete_documents.sh`
用途：
- 刪除需求文件版本與專案文件版本（管理者權限）。
- 驗證刪除後文件查詢回傳 404。

設計重點：
- 使用管理者帳密進行刪除操作。
- 驗證需求/專案文件均不可再讀取。

環境變數：
- `ADMIN_IDENTIFIER`（選填）：admin 帳號或 Email（未提供時使用腳本內 `DEFAULT_ADMIN_IDENTIFIER`）。
- `ADMIN_PASSWORD`（選填）：admin 密碼（未提供時使用腳本內 `DEFAULT_ADMIN_PASSWORD`）。

### `07_delete_requirement.sh`
用途：
- 刪除需求（管理者權限）。
- 驗證需求已無法查詢。

設計重點：
- 以管理者身份刪除需求。
- 刪除後 `GET /api/requirements/:id` 應回 404。

環境變數：
- `ADMIN_IDENTIFIER`（選填）：admin 帳號或 Email（未提供時使用腳本內 `DEFAULT_ADMIN_IDENTIFIER`）。
- `ADMIN_PASSWORD`（選填）：admin 密碼（未提供時使用腳本內 `DEFAULT_ADMIN_PASSWORD`）。

### `08_project_create_and_cleanup.sh`
用途：
- 刪除專案（管理者權限）。
- 驗證專案已從清單移除，且專案文件無法再讀取。
- 清除對應需求，避免測試殘留。

設計重點：
- 以管理者身份刪除專案。
- 刪除後 `GET /api/projects` 不應再包含該專案。
- 會同步刪除建立的需求，清理測試資料。

環境變數：
- `ADMIN_IDENTIFIER`（選填）：admin 帳號或 Email（未提供時使用腳本內 `DEFAULT_ADMIN_IDENTIFIER`）。
- `ADMIN_PASSWORD`（選填）：admin 密碼（未提供時使用腳本內 `DEFAULT_ADMIN_PASSWORD`）。

### `09_matching_flow.sh`
用途：
- 建立需求並產生媒合評估。
- 指派團隊並驗證媒合狀態。
- 清理建立的需求。

設計重點：
- 以管理者身份操作媒合流程。
- `GET /api/matching` 應回傳 `assigned` 狀態。

環境變數：
- `ADMIN_IDENTIFIER`（選填）：admin 帳號或 Email（未提供時使用腳本內 `DEFAULT_ADMIN_IDENTIFIER`）。
- `ADMIN_PASSWORD`（選填）：admin 密碼（未提供時使用腳本內 `DEFAULT_ADMIN_PASSWORD`）。

### `10_collaboration_flow.sh`
用途：
- 建立需求與專案。
- 建立任務、更新任務狀態。
- 建立里程碑、更新里程碑狀態。
- 清理建立的專案與需求。

設計重點：
- 以管理者身份呼叫任務/里程碑 API。

環境變數：
- `ADMIN_IDENTIFIER`（選填）：admin 帳號或 Email（未提供時使用腳本內 `DEFAULT_ADMIN_IDENTIFIER`）。
- `ADMIN_PASSWORD`（選填）：admin 密碼（未提供時使用腳本內 `DEFAULT_ADMIN_PASSWORD`）。

### `11_quality_flow.sh`
用途：
- 建立需求與專案。
- 觸發測試文件與 code review。
- 驗證品質報告清單回傳。
- 清理建立的專案與需求。

設計重點：
- 以管理者身份操作品質交付 API。

環境變數：
- `ADMIN_IDENTIFIER`（選填）：admin 帳號或 Email（未提供時使用腳本內 `DEFAULT_ADMIN_IDENTIFIER`）。
- `ADMIN_PASSWORD`（選填）：admin 密碼（未提供時使用腳本內 `DEFAULT_ADMIN_PASSWORD`）。

### `12_audit_logs.sh`
用途：
- 建立任務以產生稽核紀錄。
- 驗證稽核清單包含 `TASK_CREATED`。
- 清理建立的專案與需求。

設計重點：
- 以管理者身份查詢稽核紀錄。

環境變數：
- `ADMIN_IDENTIFIER`（選填）：admin 帳號或 Email（未提供時使用腳本內 `DEFAULT_ADMIN_IDENTIFIER`）。
- `ADMIN_PASSWORD`（選填）：admin 密碼（未提供時使用腳本內 `DEFAULT_ADMIN_PASSWORD`）。

### `13_project_status_flow.sh`
用途：
- 以 customer 建立需求、以 developer 建立專案與文件。
- 驗證 guard 條件未達成時會被拒絕（如：未簽核文件即推進狀態）。
- 驗證 CMMI 狀態流程（intake -> requirements_signed -> architecture_review -> system_architecture_signed -> software_design_review -> software_design_signed -> implementation -> system_verification -> system_verification_signed -> delivery_review -> closed）。
- （選擇性）以 admin 清理建立的專案與需求。

設計重點：
- 簽核動作由需求提出者（customer）執行，狀態推進由 developer 執行。
- 管理者（admin）具覆蓋權限，可同時操作簽核與狀態推進 API。
- 客戶簽核會自動推進狀態（需求/system/software/test/delivery）。
- 檢查 API 回傳的 `project.status` 是否符合預期。

環境變數：
- `CUSTOMER_IDENTIFIER`（必填）：customer 帳號或 Email。
- `CUSTOMER_PASSWORD`（必填）：customer 密碼。
- `DEVELOPER_IDENTIFIER`（必填）：developer 帳號或 Email。
- `DEVELOPER_PASSWORD`（必填）：developer 密碼。
- `ADMIN_IDENTIFIER`（選填）：admin 帳號或 Email（用於清理資料）。
- `ADMIN_PASSWORD`（選填）：admin 密碼（用於清理資料）。

## 執行範例
```bash
./docs/autotest/01_health_check.sh
./docs/autotest/02_auth_flow.sh

ADMIN_IDENTIFIER=admin@example.com \
ADMIN_PASSWORD=your_password \
./docs/autotest/03_admin_flow.sh

ADMIN_IDENTIFIER=admin@example.com \
ADMIN_PASSWORD=your_password \
./docs/autotest/04_requirement_flow.sh

ADMIN_IDENTIFIER=admin@example.com \
ADMIN_PASSWORD=your_password \
./docs/autotest/05_project_documents.sh

ADMIN_IDENTIFIER=admin@example.com \
ADMIN_PASSWORD=your_password \
./docs/autotest/06_delete_documents.sh

ADMIN_IDENTIFIER=admin@example.com \
ADMIN_PASSWORD=your_password \
./docs/autotest/07_delete_requirement.sh

ADMIN_IDENTIFIER=admin@example.com \
ADMIN_PASSWORD=your_password \
./docs/autotest/08_project_create_and_cleanup.sh

ADMIN_IDENTIFIER=admin@example.com \
ADMIN_PASSWORD=your_password \
./docs/autotest/09_matching_flow.sh

ADMIN_IDENTIFIER=admin@example.com \
ADMIN_PASSWORD=your_password \
./docs/autotest/10_collaboration_flow.sh

ADMIN_IDENTIFIER=admin@example.com \
ADMIN_PASSWORD=your_password \
./docs/autotest/11_quality_flow.sh

ADMIN_IDENTIFIER=admin@example.com \
ADMIN_PASSWORD=your_password \
./docs/autotest/12_audit_logs.sh

CUSTOMER_IDENTIFIER=customer@example.com \
CUSTOMER_PASSWORD=your_password \
DEVELOPER_IDENTIFIER=developer@example.com \
DEVELOPER_PASSWORD=your_password \
ADMIN_IDENTIFIER=admin@example.com \
ADMIN_PASSWORD=your_password \
./docs/autotest/13_project_status_flow.sh
```

## 常見失敗與除錯建議
- 若出現 `connection timeout`，請確認後端已啟動且 `API_BASE_URL` 正確。
- 若 admin 測試回 401/403，請確認帳密與 admin 角色設定。
- 若 JSON 解析失敗，可先查看腳本輸出的原始回應內容。

## 擴充建議
- 每個功能區塊新增獨立腳本，保持流程隔離。
- 以環境變數提供可配置路徑與憑證。
- 輸出保持精簡，失敗回傳非 0 方便日後串 CI。
