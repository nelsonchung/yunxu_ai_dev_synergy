import { useEffect, useState } from "react";
import { ClipboardList, Handshake, RefreshCcw, Users } from "lucide-react";
import { getSession } from "@/lib/authClient";
import {
  evaluateMatching,
  listMatchingResults,
  listRequirements,
  assignMatching,
  type MatchingResult,
  type RequirementSummary,
} from "@/lib/platformClient";

export default function Matching() {
  const [requirements, setRequirements] = useState<RequirementSummary[]>([]);
  const [matchingResults, setMatchingResults] = useState<MatchingResult[]>([]);
  const [selectedRequirement, setSelectedRequirement] = useState("");
  const [teamId, setTeamId] = useState("");
  const [budgetEstimate, setBudgetEstimate] = useState("");
  const [timelineEstimate, setTimelineEstimate] = useState("");
  const [score, setScore] = useState("80");
  const [assignTeamId, setAssignTeamId] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const loadData = async () => {
    try {
      setError("");
      const [reqs, results] = await Promise.all([listRequirements(), listMatchingResults()]);
      setRequirements(reqs);
      setMatchingResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入媒合資料。");
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

  const handleEvaluate = async () => {
    if (!selectedRequirement) {
      setError("請先選擇需求。");
      return;
    }
    try {
      setError("");
      setStatus("正在建立媒合評估...");
      await evaluateMatching({
        requirementId: selectedRequirement,
        teamId: teamId.trim() || undefined,
        budgetEstimate: budgetEstimate.trim() || undefined,
        timelineEstimate: timelineEstimate.trim() || undefined,
        score: score ? Number(score) : undefined,
      });
      setStatus("媒合評估已建立。");
      setTeamId("");
      setBudgetEstimate("");
      setTimelineEstimate("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立媒合評估失敗。");
      setStatus("");
    }
  };

  const handleAssign = async (matchingId: string) => {
    const targetTeamId = assignTeamId[matchingId]?.trim();
    if (!targetTeamId) {
      setError("請輸入團隊代號。");
      return;
    }
    try {
      setError("");
      setStatus("指派團隊中...");
      await assignMatching(matchingId, targetTeamId);
      setStatus("已完成團隊指派。");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "指派團隊失敗。");
      setStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <Handshake className="h-4 w-4" />
              媒合與估工
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">媒合評估與團隊指派</h1>
            <p className="text-muted-foreground">建立需求評估、給出估工區間並完成團隊指派。</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
          >
            <RefreshCcw className="h-4 w-4" />
            重新整理
          </button>
        </div>

        {!isAdmin ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            僅管理者可操作媒合評估與團隊指派。
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

        <div className="grid gap-6 lg:grid-cols-[0.45fr_0.55fr]">
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="h-4 w-4 text-primary" />
              建立媒合評估
            </div>
            <select
              value={selectedRequirement}
              onChange={(event) => setSelectedRequirement(event.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">選擇需求</option>
              {requirements.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({item.id.slice(0, 6)})
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="團隊代號（可選）"
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                placeholder="預算估計"
                value={budgetEstimate}
                onChange={(event) => setBudgetEstimate(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="text"
                placeholder="時程估計"
                value={timelineEstimate}
                onChange={(event) => setTimelineEstimate(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <input
              type="number"
              min={0}
              max={100}
              placeholder="評分（0-100）"
              value={score}
              onChange={(event) => setScore(event.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={handleEvaluate}
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-70"
              disabled={!isAdmin}
            >
              建立評估
            </button>
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" />
              媒合結果
            </div>
            {matchingResults.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                尚無媒合評估紀錄。
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto">
                {matchingResults.map((item) => (
                  <div key={item.id} className="rounded-2xl border bg-white/90 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">#{item.id.slice(0, 8)}</p>
                        <p className="text-sm font-semibold">需求：{item.requirementId.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">團隊：{item.teamId}</p>
                      </div>
                      <span className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground">
                        {item.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border px-3 py-1">評分 {item.score}</span>
                      <span className="rounded-full border px-3 py-1">預算 {item.budget}</span>
                      <span className="rounded-full border px-3 py-1">時程 {item.timeline}</span>
                    </div>
                    {isAdmin ? (
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          placeholder="指派團隊代號"
                          value={assignTeamId[item.id] ?? ""}
                          onChange={(event) =>
                            setAssignTeamId((prev) => ({ ...prev, [item.id]: event.target.value }))
                          }
                          className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <button
                          type="button"
                          onClick={() => handleAssign(item.id)}
                          className="inline-flex items-center justify-center rounded-full border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition"
                        >
                          指派
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
