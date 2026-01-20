# Setup Environment (Ubuntu 24.04)

此專案為 Vite + React + Tailwind + Firebase 的前端專案，主要需求為 Node.js 22 LTS 與 pnpm。

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

## Firebase 設定
本專案的 Firebase 設定目前直接寫在 `src/lib/firebase.ts`。  
若要調整 Firebase 專案或 API Key，請同時更新設定並參考：
- `docs/cellphone_authentication_by_firebase.md`

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
