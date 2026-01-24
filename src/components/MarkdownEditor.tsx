import { useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

const editorModes = [
  { id: "edit", label: "編輯" },
  { id: "split", label: "分割" },
  { id: "preview", label: "預覽" },
] as const;

type EditorMode = (typeof editorModes)[number]["id"];

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeightClassName?: string;
};

const buildPreview = (value: string) => {
  const raw = marked.parse(value, { gfm: true, breaks: true });
  return DOMPurify.sanitize(raw);
};

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
  minHeightClassName = "min-h-[420px]",
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<EditorMode>("split");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const previewHtml = useMemo(() => buildPreview(value || ""), [value]);

  const updateSelection = (start: number, end: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end);
    });
  };

  const wrapSelection = (prefix: string, suffix: string, placeholderText: string) => {
    const textarea = textareaRef.current;
    if (!textarea || readOnly) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || placeholderText;
    const nextValue = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
    onChange(nextValue);
    updateSelection(start + prefix.length, start + prefix.length + selected.length);
  };

  const prefixLines = (prefix: string, placeholderText: string) => {
    const textarea = textareaRef.current;
    if (!textarea || readOnly) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || placeholderText;
    const lines = selected.split("\n");
    const transformed = lines
      .map((line) => (line.trim() ? `${prefix}${line}` : prefix.trimEnd()))
      .join("\n");
    const nextValue = `${value.slice(0, start)}${transformed}${value.slice(end)}`;
    onChange(nextValue);
    updateSelection(start, start + transformed.length);
  };

  const insertBlock = (block: string, cursorOffset: number) => {
    const textarea = textareaRef.current;
    if (!textarea || readOnly) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${value.slice(0, start)}${block}${value.slice(end)}`;
    onChange(nextValue);
    const cursor = start + cursorOffset;
    updateSelection(cursor, cursor);
  };

  const wordCount = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [value]);

  const lineCount = useMemo(() => {
    if (!value) return 0;
    return value.split("\n").length;
  }, [value]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => wrapSelection("# ", "", "標題")}
            disabled={readOnly}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition disabled:opacity-60"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("## ", "", "小標題")}
            disabled={readOnly}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition disabled:opacity-60"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("### ", "", "子標題")}
            disabled={readOnly}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition disabled:opacity-60"
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("#### ", "", "小節標題")}
            disabled={readOnly}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition disabled:opacity-60"
          >
            H4
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("**", "**", "粗體文字")}
            disabled={readOnly}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition disabled:opacity-60"
          >
            粗體
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("*", "*", "斜體文字")}
            disabled={readOnly}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition disabled:opacity-60"
          >
            斜體
          </button>
          <button
            type="button"
            onClick={() => prefixLines("- ", "清單項目")}
            disabled={readOnly}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition disabled:opacity-60"
          >
            清單
          </button>
          <button
            type="button"
            onClick={() => prefixLines("1. ", "編號項目")}
            disabled={readOnly}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition disabled:opacity-60"
          >
            編號
          </button>
          <button
            type="button"
            onClick={() => prefixLines("> ", "引用內容")}
            disabled={readOnly}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition disabled:opacity-60"
          >
            引用
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("`", "`", "程式碼")}
            disabled={readOnly}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition disabled:opacity-60"
          >
            行內碼
          </button>
          <button
            type="button"
            onClick={() => insertBlock("```\n程式碼\n```\n", 4)}
            disabled={readOnly}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition disabled:opacity-60"
          >
            區塊碼
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("[", "](https://)", "連結文字")}
            disabled={readOnly}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition disabled:opacity-60"
          >
            連結
          </button>
          <button
            type="button"
            onClick={() => insertBlock("![圖片說明](https://)\n", 6)}
            disabled={readOnly}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition disabled:opacity-60"
          >
            圖片
          </button>
          <button
            type="button"
            onClick={() =>
              insertBlock(
                "| 欄位 | 內容 |\n| --- | --- |\n| 範例 | 請填寫 |\n",
                0
              )
            }
            disabled={readOnly}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition disabled:opacity-60"
          >
            表格
          </button>
        </div>

        <div className="flex items-center gap-2">
          {editorModes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                mode === item.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-primary hover:border-primary/40"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`grid gap-4 ${
          mode === "split" ? "lg:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {mode !== "preview" ? (
          <div className="rounded-2xl border bg-white/90 p-4">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              readOnly={readOnly}
              className={`w-full resize-none rounded-xl border border-border bg-white/90 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 ${minHeightClassName}`}
            />
          </div>
        ) : null}

        {mode !== "edit" ? (
          <div className="rounded-2xl border bg-white/90 p-4">
            <div
              className={`markdown-preview ${minHeightClassName} overflow-auto`}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground">
        <span>字數：{wordCount} · 行數：{lineCount}</span>
        <span>{readOnly ? "唯讀模式" : "Markdown 編輯模式"}</span>
      </div>
    </div>
  );
}
