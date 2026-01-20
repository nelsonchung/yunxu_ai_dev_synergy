# Firebase 基本設定說明

本文件說明本專案的 Firebase 初始化與基本設定。手機登入流程暫不納入此專案。

## 1. Firebase Console 設定

1) 建立 Firebase 專案並完成 Web App 註冊。  
2) 若未來會使用 Authentication，請到 Authentication → 設定 → 已授權網域，加入：
   - `localhost`
   - `127.0.0.1`
   - 上線用網域（若有）

### 1.1 Blaze 方案（即付即用）

若要正式發送手機簡訊驗證碼，需要綁定 Cloud Billing 並升級至 Blaze 方案。  
已升級後，即可避免 `auth/billing-not-enabled` 錯誤。

重點：
- Blaze 為「用多少付多少」，只開啟不會自動收費。
- 建議在 Google Cloud Billing 設定預算與提醒。

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

開啟 `http://localhost:5173` 確認頁面可正常載入即可。

---

如需加入 Firebase Authentication 或其他服務，再依需求擴充對應模組。
