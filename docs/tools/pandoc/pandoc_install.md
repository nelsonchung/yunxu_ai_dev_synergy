# Ubuntu 24.04 Pandoc 環境安裝與配置指南

本文件詳解如何在 Ubuntu 24.04 (Noble Numbat) 環境下配置 Markdown 轉檔工具鏈，特別針對繁體中文支援與 PDF 輸出進行優化。

## 1. 安裝核心工具

首先安裝 Pandoc 本體及其基礎依賴：

```bash
sudo apt-get update
sudo apt-get install -y pandoc
```

## 2. 安裝 PDF 轉換引擎 (wkhtmltopdf)
Pandoc 轉換 PDF 需要外部引擎。雖然傳統上使用 LaTeX (TeX Live)，但對於大多數文件，使用基於 Webkit 的 wkhtmltopdf 更加輕量且快速。

```bash
sudo apt-get install -y wkhtmltopdf
```

## 3. 安裝中文字體 (關鍵步驟)
在 Linux 伺服器環境中，若未安裝中文字體，輸出的 PDF 將會出現亂碼或空白。建議安裝 Google 提供的開源字體：
```bash
sudo apt-get install -y fonts-noto-cjk
```

## 4. Ubuntu 24.04 系統依賴修正 (t64)
Ubuntu 24.04 對於底層函式庫進行了 64 位元時間格式轉換 (t64 transition)。若轉換引擎啟動失敗，請確保安裝以下正確版本的套件：

```bash
sudo apt-get install -y libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2t64
```


## 5. 常用轉換指令
### 5.1 轉換為 HTML
```bash
pandoc input.md -o output.html --metadata title="文件標題"
```

### 5.2 轉換為 PDF
使用 wkhtmltopdf 引擎並指定 HTML5 格式進行渲染：
```bash
pandoc input.md -t html5 -o output.pdf --pdf-engine=wkhtmltopdf --metadata title="文件標題"
```

