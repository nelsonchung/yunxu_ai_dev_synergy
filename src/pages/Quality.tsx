import { useEffect, useState } from "react";
import { ClipboardCheck, RefreshCcw, Sparkles, TestTube2 } from "lucide-react";
import { getSession } from "@/lib/authClient";
import {
  generateTesting,
  listProjects,
  listQualityReports,
  requestCodeReview,
  type ProjectSummary,
  type QualityReport,
} from "@/lib/platformClient";

export default function Quality() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [reports, setReports] = useState<QualityReport[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [testScope, setTestScope] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [commitSha, setCommitSha] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const loadData = async (projectId?: string) => {
    try {
      setError("");
      const [projectList, reportList] = await Promise.all([
        listProjects(),
        listQualityReports(projectId),
      ]);
      setProjects(projectList);
      setReports(reportList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入品質報告。");
    }
  };

  useEffect(() => {
    const syncSession = async () => {
      const session = await getSession();
      setIsAdmin(session?.role === "admin");
    };
    syncSession();
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    loadData(selectedProjectId);
  }, [selectedProjectId]);

  const handleGenerateTesting = async () => {
    if (!selectedProjectId) {
      setError("請先選擇專案。");
      return;
    }
    try {
      setError("");
      setStatus("正在產生測試文件...");
      await generateTesting({ projectId: selectedProjectId, scope: testScope });
      setStatus("測試文件已產生。");
      setTestScope("");
      await loadData(selectedProjectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "產生測試文件失敗。");
      setStatus("");
    }
  };

  const handleCodeReview = async () => {
    if (!selectedProjectId || !repoUrl.trim() || !commitSha.trim()) {
      setError("請輸入專案、Repository URL 與 Commit SHA。");
      return;
    }
    try {
      setError("");
      setStatus("正在提交 code review...");
      await requestCodeReview({
        projectId: selectedProjectId,
        repositoryUrl: repoUrl.trim(),
        commitSha: commitSha.trim(),
      });
      setStatus("已提交 code review 任務。");
      setRepoUrl("");
      setCommitSha("");
      await loadData(selectedProjectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交 code review 失敗。");
      setStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <ClipboardCheck className="h-4 w-4" />
              品質交付
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">測試與品質報告</h1>
            <p className="text-muted-foreground">生成測試文件、提交 code review，並集中查看品質報告。</p>
          </div>
          <button
            type="button"
            onClick={() => loadData(selectedProjectId)}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
          >
            <RefreshCcw className="h-4 w-4" />
            重新整理
          </button>
        </div>

        {!isAdmin ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            僅管理者可操作品質交付流程。
          </div>
        ) : null}

        {(error || status) && (
          <div
            className={`rounded-2xl border p-4 text-sm ${
              error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || status}
          </div>
        )}

        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TestTube2 className="h-4 w-4 text-primary" />
            選擇專案
          </div>
          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">選擇專案</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.id.slice(0, 6)})
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              生成測試文件
            </div>
            <textarea
              rows={3}
              value={testScope}
              onChange={(event) => setTestScope(event.target.value)}
              placeholder="描述測試範圍或關鍵模組"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={handleGenerateTesting}
              disabled={!isAdmin}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-70"
            >
              產生測試文件
            </button>
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Code Review
            </div>
            <input
              type="text"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="Repository URL"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="text"
              value={commitSha}
              onChange={(event) => setCommitSha(event.target.value)}
              placeholder="Commit SHA"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={handleCodeReview}
              disabled={!isAdmin}
              className="inline-flex items-center justify-center rounded-full border border-primary/30 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition disabled:opacity-70"
            >
              提交審查
            </button>
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-serif text-2xl font-bold">品質報告清單</h2>
          {reports.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              尚無品質報告。
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {reports.map((report) => (
                <div key={report.id} className="rounded-2xl border bg-white/90 p-4 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">#{report.id.slice(0, 8)}</p>
                      <p className="font-semibold">{report.type}</p>
                      <p className="text-xs text-muted-foreground">專案：{report.projectId.slice(0, 8)}</p>
                    </div>
                    <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                      {report.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{report.summary}</p>
                  <p className="text-xs text-muted-foreground">建立時間：{report.createdAt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
