# Firebase 基本設定說明

本文件說明本專案的 Firebase 初始化與基本設定。手機登入流程暫不納入此專案。

## 1. Firebase Console 設定

1) 建立 Firebase 專案並完成 Web App 註冊。  
2) 若未來會使用 Authentication，請到 Authentication → 設定 → 已授權網域，加入：
   - `localhost`
   - `127.0.0.1`
   - 上線用網域（若有）
3) Firebase 專案即對應 Google Cloud 專案，後續 API Key 設定請務必在同一個專案中操作。

### 1.1 Blaze 方案（即付即用）

若要正式發送手機簡訊驗證碼，需要綁定 Cloud Billing 並升級至 Blaze 方案。  
已升級後，即可避免 `auth/billing-not-enabled` 錯誤。

重點：
- Blaze 為「用多少付多少」，只開啟不會自動收費。
- 建議在 Google Cloud Billing 設定預算與提醒。

### 1.2 Google Cloud Console API Key 設定

Firebase 的 Browser key 需要在 Google Cloud Console 內設定。請確認右上角已切到與 Firebase 相同的專案（例如 `yunxu-ai-dev`）。

建議設定流程：
1) Google Cloud Console → APIs & Services → Credentials  
2) 點選 `Browser key (auto created by Firebase)`  
3) 應用程式限制：選「網站 (HTTP referrers)」，加入  
   - `http://localhost:5173/*`  
   - `http://127.0.0.1:5173/*`  
4) API 限制：選「限制金鑰」，只保留 **Identity Toolkit API**  
   - 介面可能找不到「Firebase Authentication API」，這是正常的，Identity Toolkit API 即為對應項目。

排錯時的暫時設定：
- 應用程式限制：`None`
- API 限制：`Don’t restrict key`

> API Key 設定修改後，通常需要等待 2–5 分鐘生效。

### 1.3 OAuth 2.0 是否需要設定

若僅使用「手機號碼登入」，不需要設定 OAuth 2.0。  
OAuth 2.0 主要用於 Google / Facebook / GitHub 等社群登入。

## 2. 安裝依賴

```bash
pnpm add firebase
```

## 3. 專案檔案位置

- Firebase 初始化：`src/lib/firebase.ts`

## 4. Firebase 初始化

目前使用 Firebase Console 提供的 `firebaseConfig`，直接初始化在：

`src/lib/firebase.ts`

```ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};

const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
```

> 若要改成使用 `.env`，可再新增 `VITE_FIREBASE_*` 變數並改寫此檔案。

## 5. 本機測試

```bash
pnpm dev
```

開啟 `http://localhost:5173` 或 `http://localhost:5173/auth` 確認頁面可正常載入即可。

## 6. 常見錯誤排查

### 6.1 auth/invalid-app-credential

常見原因：
- API Key 限制未包含 `localhost:5173`
- API 限制未包含 Identity Toolkit API
- reCAPTCHA token 無效（廣告阻擋器或第三方 cookie 被封鎖）

建議做法：
- 確認 Google Cloud Console 的 API Key 限制設定  
- 重新整理頁面或清除站台資料  
- 暫時停用擋廣告外掛或用無痕模式測試

### 6.2 auth/too-many-requests

代表短時間內嘗試太多次，Firebase 觸發保護機制。  
建議等 15–60 分鐘再試，或改用「測試電話號碼」。

### 6.3 auth/billing-not-enabled

需升級到 Blaze 方案並綁定 Cloud Billing，詳見 1.1。

## 7. 參考圖片

- Firebase Authentication 區域：`docs/firebase/authentication_area.png`
- Firebase Web App 設定資訊：`docs/firebase/firebase_configure.png`

---

如需加入 Firebase Authentication 或其他服務，再依需求擴充對應模組。
