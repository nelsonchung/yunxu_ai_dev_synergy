#!/bin/bash

# 1. 搜尋當前資料夾下的所有 .md 檔案
FILES=( *.md )

# 檢查是否有任何 .md 檔案
if [ "${FILES[0]}" == "*.md" ] || [ ${#FILES[@]} -eq 0 ]; then
    echo "Error: No .md files found in the current directory."
    exit 1
fi

# 2. 列出檔案讓使用者選擇
echo "------------------------------------------"
echo "Found the following Markdown files:"
for i in "${!FILES[@]}"; do
    echo "$((i+1))) ${FILES[$i]}"
done
echo "------------------------------------------"

read -p "Select a file to convert (enter number): " file_idx

# 驗證輸入是否為數字且在範圍內
if [[ ! $file_idx =~ ^[0-9]+$ ]] || [ $file_idx -lt 1 ] || [ $file_idx -gt ${#FILES[@]} ]; then
    echo "Invalid file selection."
    exit 1
fi

SELECTED_FILE="${FILES[$((file_idx-1))]}"
BASENAME="${SELECTED_FILE%.*}"

echo "Selected: $SELECTED_FILE"
echo ""

# 3. 選擇輸出格式
echo "Select output format:"
echo "1) HTML (will be saved to ./html/)"
echo "2) PDF  (will be saved to ./pdf/)"
echo "3) Both"
read -p "Enter choice [1-3]: " format_choice

# 4. 檢查並建立目錄
# mkdir -p 會在目錄不存在時建立，存在時則不動作
mkdir -p html
mkdir -p pdf

case $format_choice in
    1)
        pandoc "$SELECTED_FILE" -o "html/${BASENAME}.html" --metadata title="${BASENAME}"
        echo "Successfully exported to html/${BASENAME}.html"
        ;;
    2)
        echo "Converting to PDF (using wkhtmltopdf)..."
        pandoc "$SELECTED_FILE" -t html5 -o "pdf/${BASENAME}.pdf" --pdf-engine=wkhtmltopdf --metadata title="${BASENAME}"
        echo "Successfully exported to pdf/${BASENAME}.pdf"
        ;;
    3)
        pandoc "$SELECTED_FILE" -o "html/${BASENAME}.html" --metadata title="${BASENAME}"
        echo "Successfully exported to html/${BASENAME}.html"
        
        echo "Converting to PDF..."
        pandoc "$SELECTED_FILE" -t html5 -o "pdf/${BASENAME}.pdf" --pdf-engine=wkhtmltopdf --metadata title="${BASENAME}"
        echo "Successfully exported to pdf/${BASENAME}.pdf"
        ;;
    *)
        echo "Invalid format choice."
        exit 1
        ;;
esac