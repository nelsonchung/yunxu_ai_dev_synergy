import { useEffect, useMemo, useState } from "react";
import { Calculator, Coins, Save } from "lucide-react";
import {
  getProjectDocumentQuotation,
  saveProjectDocumentQuotation,
  submitProjectDocumentQuotation,
  type QuotationReview as QuotationReviewData,
  type QuotationReviewItem,
} from "@/lib/platformClient";
import { buildQuotationCsv, downloadCsv, printQuotation } from "@/lib/quotationExport";

const priceOptions = [500, 1000, 1500, 2000, 3000, 5000, 10000];
const defaultPrice = 500;

type OutlineItem = {
  key: string;
  path: string;
  h1: string;
  h2: string | null;
  h3: string;
};

type OutlineSubsection = {
  key: string;
  title: string;
  items: OutlineItem[];
};

type OutlineSection = {
  key: string;
  title: string;
  subsections: OutlineSubsection[];
};

const formatPrice = (value: number) => new Intl.NumberFormat("zh-TW").format(value);
const quotationStatusLabels: Record<string, string> = {
  draft: "草稿",
  submitted: "已提交",
  approved: "已核准",
  changes_requested: "需調整",
};
const quotationHistoryLabels: Record<string, string> = {
  submitted: "提交報價",
  approved: "客戶核准",
  changes_requested: "客戶要求調整",
};

const buildUniqueKey = (base: string, counter: Map<string, number>) => {
  const current = counter.get(base) ?? 0;
  counter.set(base, current + 1);
  return current === 0 ? base : `${base}::${current + 1}`;
};

const parseMarkdownOutline = (markdown: string) => {
  const lines = markdown.split(/\r?\n/);
  const sections: OutlineSection[] = [];
  const items: OutlineItem[] = [];
  const keyCounter = new Map<string, number>();

  let currentSection: OutlineSection | null = null;
  let currentSubsection: OutlineSubsection | null = null;

  const ensureSection = () => {
    if (currentSection) return;
    const fallback: OutlineSection = {
      key: `section-${sections.length}`,
      title: "未分類",
      subsections: [],
    };
    sections.push(fallback);
    currentSection = fallback;
  };

  const ensureSubsection = () => {
    if (currentSubsection) return;
    ensureSection();
    const fallback: OutlineSubsection = {
      key: `${currentSection?.key ?? "section"}-sub-${currentSection?.subsections.length ?? 0}`,
      title: "未分類",
      items: [],
    };
    currentSection?.subsections.push(fallback);
    currentSubsection = fallback;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const h1Match = trimmed.match(/^#\s+(.+)/);
    if (h1Match) {
      const title = h1Match[1].trim();
      if (!title) return;
      const section: OutlineSection = {
        key: `section-${sections.length}`,
        title,
        subsections: [],
      };
      sections.push(section);
      currentSection = section;
      currentSubsection = null;
      return;
    }

    const h2Match = trimmed.match(/^##\s+(.+)/);
    if (h2Match) {
      const title = h2Match[1].trim();
      if (!title) return;
      ensureSection();
      const subsection: OutlineSubsection = {
        key: `${currentSection?.key ?? "section"}-sub-${currentSection?.subsections.length ?? 0}`,
        title,
        items: [],
      };
      currentSection?.subsections.push(subsection);
      currentSubsection = subsection;
      return;
    }

    const h3Match = trimmed.match(/^###\s+(.+)/);
    if (h3Match) {
      const title = h3Match[1].trim();
      if (!title) return;
      ensureSection();
      ensureSubsection();
      const path = `${currentSection?.title ?? "未分類"} / ${
        currentSubsection?.title ?? "未分類"
      } / ${title}`;
      const key = buildUniqueKey(path, keyCounter);
      const item: OutlineItem = {
        key,
        path,
        h1: currentSection?.title ?? "未分類",
        h2: currentSubsection?.title ?? "未分類",
        h3: title,
      };
      currentSubsection?.items.push(item);
      items.push(item);
    }
  });

  return { sections, items };
};

type QuotationReviewProps = {
  markdown: string;
  projectId: string;
  documentId: string | null;
};

export default function QuotationReview({
  markdown,
  projectId,
  documentId,
}: QuotationReviewProps) {
  const outline = useMemo(() => parseMarkdownOutline(markdown), [markdown]);
  const [quotation, setQuotation] = useState<QuotationReviewData | null>(null);
  const [priceMap, setPriceMap] = useState<Record<string, number | "">>({});
  const [bulkPrice, setBulkPrice] = useState(String(defaultPrice));
  const [hydratedQuotationId, setHydratedQuotationId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!projectId || !documentId) {
      setQuotation(null);
      setHydratedQuotationId(null);
      return;
    }

    const loadQuotation = async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await getProjectDocumentQuotation(projectId, documentId);
        setQuotation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法載入報價資料。");
      } finally {
        setIsLoading(false);
      }
    };

    loadQuotation();
  }, [projectId, documentId]);

  useEffect(() => {
    const savedByKey = new Map<string, number | null>();
    const savedByPath = new Map<string, number | null>();
    if (quotation) {
      quotation.items.forEach((item) => {
        savedByKey.set(item.key, item.price ?? null);
        savedByPath.set(item.path, item.price ?? null);
      });
    }

    setPriceMap((prev) => {
      const next: Record<string, number | ""> = {};
      const shouldHydrate = quotation && quotation.id !== hydratedQuotationId;
      outline.items.forEach((item) => {
        if (!shouldHydrate && prev[item.key] !== undefined) {
          next[item.key] = prev[item.key];
          return;
        }
        const saved = savedByKey.has(item.key) ? savedByKey.get(item.key) : savedByPath.get(item.path);
        if (quotation && saved !== undefined) {
          next[item.key] = typeof saved === "number" ? saved : "";
          return;
        }
        next[item.key] = typeof saved === "number" ? saved : defaultPrice;
      });
      return next;
    });
    if (quotation && quotation.id !== hydratedQuotationId) {
      setHydratedQuotationId(quotation.id);
    }
    if (!quotation && hydratedQuotationId !== null) {
      setHydratedQuotationId(null);
    }
  }, [outline.items, quotation, hydratedQuotationId]);

  const totals = useMemo(() => {
    let grandTotal = 0;
    let filledCount = 0;
    let itemCount = 0;
    const sectionTotals: Record<string, number> = {};
    const subsectionTotals: Record<string, number> = {};

    outline.sections.forEach((section) => {
      let sectionSum = 0;
      section.subsections.forEach((subsection) => {
        let subSum = 0;
        subsection.items.forEach((item) => {
          itemCount += 1;
          const value = priceMap[item.key];
          if (typeof value === "number") {
            filledCount += 1;
            subSum += value;
          }
        });
        subsectionTotals[subsection.key] = subSum;
        sectionSum += subSum;
      });
      sectionTotals[section.key] = sectionSum;
      grandTotal += sectionSum;
    });

    return { grandTotal, filledCount, itemCount, sectionTotals, subsectionTotals };
  }, [outline.sections, priceMap]);

  const buildPayloadItems = (): QuotationReviewItem[] =>
    outline.items.map((item) => ({
      key: item.key,
      path: item.path,
      h1: item.h1,
      h2: item.h2,
      h3: item.h3,
      price: typeof priceMap[item.key] === "number" ? priceMap[item.key] : null,
    }));

  const handleSave = async () => {
    if (!projectId || !documentId) return;
    setStatus("");
    setError("");
    try {
      setIsSaving(true);
      const saved = await saveProjectDocumentQuotation(projectId, documentId, {
        currency: "TWD",
        items: buildPayloadItems(),
      });
      setQuotation(saved);
      setStatus("報價已儲存。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存報價失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!projectId || !documentId || outline.items.length === 0) return;
    setStatus("");
    setError("");
    try {
      setIsSubmitting(true);
      const saved = await saveProjectDocumentQuotation(projectId, documentId, {
        currency: "TWD",
        items: buildPayloadItems(),
      });
      const submitted = await submitProjectDocumentQuotation(projectId, documentId);
      setQuotation(submitted ?? saved);
      setStatus("已提交報價給客戶審核。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交報價失敗。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    if (outline.items.length === 0) return;
    const items = buildPayloadItems();
    const csv = buildQuotationCsv({ items, total: totals.grandTotal, currencyLabel: "TWD" });
    downloadCsv(`quotation_${documentId ?? "software"}.csv`, csv);
  };

  const handlePrint = () => {
    if (outline.items.length === 0) return;
    const items = buildPayloadItems();
    printQuotation({
      title: "審查報價",
      items,
      total: totals.grandTotal,
      currencyLabel: "TWD",
    });
  };

  const applyBulkPrice = () => {
    if (!bulkPrice) return;
    const value = Number(bulkPrice);
    if (!Number.isFinite(value)) return;
    setPriceMap((prev) => {
      const next = { ...prev };
      outline.items.forEach((item) => {
        if (next[item.key] === "") {
          next[item.key] = value;
        }
      });
      return next;
    });
  };

  const clearAllPrices = () => {
    setPriceMap((prev) => {
      const next: Record<string, number | ""> = { ...prev };
      outline.items.forEach((item) => {
        next[item.key] = "";
      });
      return next;
    });
  };

  const fillAveragePrice = () => {
    const values = outline.items
      .map((item) => priceMap[item.key])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const avg = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : defaultPrice;
    setPriceMap((prev) => {
      const next: Record<string, number | ""> = { ...prev };
      outline.items.forEach((item) => {
        next[item.key] = avg;
      });
      return next;
    });
  };

  if (!markdown.trim()) {
    return null;
  }

  return (
    <div className="rounded-3xl border bg-white/90 p-6 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
            <Calculator className="h-4 w-4" />
            審查報價
          </div>
          <p className="text-sm text-muted-foreground">
            # 大項、## 中項、### 小項分層列出，小項可設定價格並自動加總。
          </p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <p className="text-xs text-muted-foreground">總計</p>
          <p className="text-lg font-semibold text-foreground">NT$ {formatPrice(totals.grandTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            已填寫 {totals.filledCount}/{totals.itemCount} 項
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            狀態：{quotation ? quotationStatusLabels[quotation.status] ?? quotation.status : "草稿"}
          </p>
        </div>
      </div>

      {!documentId ? (
        <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          請先儲存軟體設計文件版本後再建立審查報價。
        </div>
      ) : null}

      {(error || status || isLoading) && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || (isLoading ? "載入報價資料..." : status)}
        </div>
      )}

      {quotation?.status === "changes_requested" && quotation.reviewComment ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-semibold">客戶要求調整：</p>
          <p className="mt-1 whitespace-pre-wrap">{quotation.reviewComment}</p>
        </div>
      ) : null}

      {quotation?.history?.length ? (
        <div className="rounded-2xl border bg-white/90 p-4 space-y-2 text-xs text-muted-foreground">
          <p className="text-sm font-semibold text-foreground">審核歷程</p>
          {quotation.history.map((item) => (
            <div key={item.id} className="rounded-xl border bg-secondary/10 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{quotationHistoryLabels[item.action] ?? item.action}</span>
                <span>{item.createdAt}</span>
              </div>
              {item.comment ? <p className="mt-1 text-amber-700">{item.comment}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {outline.sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          尚未偵測到 # / ## / ### 標題，請補上大項、中項、小項。
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white px-4 py-3">
            <div className="text-sm font-medium">批次套用預設價格</div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bulkPrice}
                onChange={(event) => setBulkPrice(event.target.value)}
                className="rounded-lg border border-border bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">選擇價格</option>
                {priceOptions.map((option) => (
                  <option key={option} value={option}>
                    NT$ {formatPrice(option)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyBulkPrice}
                className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition"
              >
                套用到未填小項
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              只會填入尚未設定價格的小項
            </div>
          </div>

          <div className="space-y-4">
            {outline.sections.map((section) => (
              <div key={section.key} className="rounded-2xl border bg-white p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">大項</p>
                    <p className="text-base font-semibold text-foreground">{section.title}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Coins className="h-4 w-4 text-primary" />
                    小計 NT$ {formatPrice(totals.sectionTotals[section.key] || 0)}
                  </div>
                </div>

                {section.subsections.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                    尚無中項，請加入 ## 標題。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {section.subsections.map((subsection) => (
                      <div key={subsection.key} className="rounded-2xl border bg-secondary/10 p-3 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">中項</p>
                            <p className="text-sm font-semibold text-foreground">{subsection.title}</p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            小計 NT$ {formatPrice(totals.subsectionTotals[subsection.key] || 0)}
                          </div>
                        </div>

                        {subsection.items.length === 0 ? (
                          <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                            尚無小項，請加入 ### 標題。
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {subsection.items.map((item) => {
                              const current = priceMap[item.key];
                              return (
                                <div
                                  key={item.key}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2"
                                >
                                  <div className="text-sm font-medium text-foreground">{item.h3}</div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <label className="text-xs text-muted-foreground">預設</label>
                                    <select
                                      value={typeof current === "number" && priceOptions.includes(current) ? current : ""}
                                      onChange={(event) => {
                                        const raw = event.target.value;
                                        setPriceMap((prev) => ({
                                          ...prev,
                                          [item.key]: raw ? Number(raw) : "",
                                        }));
                                      }}
                                      className="rounded-lg border border-border bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    >
                                      <option value="">選擇</option>
                                      {priceOptions.map((option) => (
                                        <option key={option} value={option}>
                                          NT$ {formatPrice(option)}
                                        </option>
                                      ))}
                                    </select>
                                    <label className="text-xs text-muted-foreground">自訂</label>
                                    <input
                                      type="number"
                                      min={0}
                                      step={100}
                                      value={typeof current === "number" ? current : ""}
                                      onChange={(event) => {
                                        const raw = event.target.value;
                                        const nextValue = raw === "" ? "" : Number(raw);
                                        setPriceMap((prev) => ({
                                          ...prev,
                                          [item.key]:
                                            nextValue === "" || Number.isFinite(nextValue) ? nextValue : "",
                                        }));
                                      }}
                                      placeholder="輸入金額"
                                      className="w-28 rounded-lg border border-border bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={clearAllPrices}
                className="rounded-full border border-amber-200 px-3 py-1 font-semibold text-amber-700 hover:bg-amber-50 transition"
              >
                清空全部
              </button>
              <button
                type="button"
                onClick={fillAveragePrice}
                className="rounded-full border border-sky-200 px-3 py-1 font-semibold text-sky-700 hover:bg-sky-50 transition"
              >
                填入平均值
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={outline.items.length === 0}
                className="rounded-full border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                匯出 CSV
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={outline.items.length === 0}
                className="rounded-full border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                列印
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!documentId || isSaving || isLoading || outline.items.length === 0}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                儲存報價
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  !documentId ||
                  isSaving ||
                  isLoading ||
                  isSubmitting ||
                  outline.items.length === 0 ||
                  quotation?.status === "submitted" ||
                  quotation?.status === "approved"
                }
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                提交給客戶審核
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
