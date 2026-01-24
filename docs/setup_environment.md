# Setup Environment (Ubuntu 24.04)

此專案為 Vite + React + Tailwind + Fastify 的前後端專案，主要需求為 Node.js 22 LTS 與 pnpm。

## Base packages
安裝 Node.js 原生模組與建置工具常用的基礎套件（建議先裝）。
```bash
sudo apt update
sudo apt install -y git curl build-essential python3 pkg-config
```

## Node.js 22 LTS
安裝建置與執行 Vite 所需的 Node.js 執行環境。
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

## pnpm (project uses pnpm@10.x)
啟用 corepack 並固定 pnpm 版本，確保依賴安裝與 lockfile 一致。
```bash
corepack enable
corepack prepare pnpm@10.4.1 --activate
```

## Install dependencies
安裝專案相依套件。
```bash
pnpm install
```

## Backend（方案 B：JSON NoSQL）
若要實作帳號/密碼登入（方案 B），需新增後端服務與 JSON 儲存檔案。

### 建議環境變數（後端）
```env
DATA_USERS_FILE="./data/users.json"
DATA_AUDIT_FILE="./data/audit_logs.json"
# Optional legacy file (used for one-time migration)
DATA_FILE="./data/auth.json"
JWT_SECRET="change_me"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173"
```

> `DATA_USERS_FILE` 與 `DATA_AUDIT_FILE` 分別保存使用者資料與操作紀錄。

### 後端安裝與啟動（Fastify）
```bash
cd server
cp .env.nosqljson.example .env
pnpm install
pnpm dev
```

> 後端預設埠：`8787`（可用 `PORT` 環境變數調整）。

> 若要改回 PostgreSQL 模式，可改用 `server/.env.postgresql.example` 作為範本。

## Start dev server
啟動 Vite 開發伺服器（預設 `http://localhost:5173`）。
```bash
pnpm dev
```

或使用一鍵腳本：
```bash
./start_dev.sh
```

## Optional checks
僅做型別檢查（不輸出檔案）：
```bash
pnpm check
```
