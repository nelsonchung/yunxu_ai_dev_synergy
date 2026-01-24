import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Crown,
  KeyRound,
  RefreshCcw,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import { listUsers, resetUserPassword, updateUserRole, type AdminUser } from "@/lib/adminClient";

const roleLabels: Record<AdminUser["role"], string> = {
  admin: "管理者",
  customer: "客戶",
  developer: "開發者",
};

const roleOptions: Array<{
  value: AdminUser["role"];
  label: string;
  description: string;
  icon: typeof UserRound;
  tone: string;
}> = [
  {
    value: "customer",
    label: "客戶",
    description: "提出需求、確認文件與驗收",
    icon: UserRound,
    tone: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
  },
  {
    value: "developer",
    label: "開發者",
    description: "負責規劃、實作與交付",
    icon: UserCog,
    tone: "border-sky-200 bg-sky-50/70 text-sky-700",
  },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AdminUser["role"]>>({});
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [adminConfirmTarget, setAdminConfirmTarget] = useState<string | null>(null);
  const [isSavingRole, setIsSavingRole] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await listUsers();
      setUsers(data);
      setRoleDrafts(
        data.reduce<Record<string, AdminUser["role"]>>((acc, user) => {
          acc[user.id] = user.role;
          return acc;
        }, {})
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法取得使用者清單。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) => {
      return (
        user.username.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.role.toLowerCase().includes(keyword) ||
        user.status.toLowerCase().includes(keyword)
      );
    });
  }, [users, query]);

  const handleRoleSave = async (userId: string) => {
    const role = roleDrafts[userId];
    if (!role) return;
    try {
      setIsSavingRole(userId);
      setError("");
      setStatus("");
      const updated = await updateUserRole(userId, role);
      setUsers((prev) => prev.map((user) => (user.id === userId ? updated : user)));
      setStatus("角色已更新。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新角色失敗。");
    } finally {
      setIsSavingRole(null);
    }
  };

  const handleAdminUpgrade = async (userId: string) => {
    try {
      setIsSavingRole(userId);
      setError("");
      setStatus("");
      const updated = await updateUserRole(userId, "admin");
      setUsers((prev) => prev.map((user) => (user.id === userId ? updated : user)));
      setStatus("已升級為管理者。");
      setAdminConfirmTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "升級管理者失敗。");
    } finally {
      setIsSavingRole(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (!resetPassword || resetPassword.length < 8) {
      setError("密碼至少 8 碼。");
      return;
    }
    if (resetPassword !== resetConfirm) {
      setError("新密碼與確認密碼不一致。");
      return;
    }
    try {
      setIsResetting(true);
      await resetUserPassword(resetTarget, resetPassword);
      setStatus("密碼已重設。");
      setResetPassword("");
      setResetConfirm("");
      setResetTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重設密碼失敗。");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              管理者專區
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">使用者管理</h1>
            <p className="text-muted-foreground">
              管理帳號角色、重設密碼，並保留後續欄位擴充的彈性。
            </p>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
          >
            <RefreshCcw className="h-4 w-4" />
            重新整理
          </button>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl border bg-white/90 px-4 py-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                name="user-search"
                placeholder="搜尋帳號、Email、角色或狀態"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                className="w-full bg-transparent focus:outline-none"
              />
            </div>
            <span className="text-sm text-muted-foreground">共 {filteredUsers.length} 位使用者</span>
          </div>

          {(error || status) && (
            <div
              className={`rounded-2xl border p-4 text-sm ${
                error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {error || status}
            </div>
          )}

          {isLoading ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              正在載入使用者清單...
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="rounded-2xl border bg-white/90 p-4 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">#{user.id.slice(0, 8)}</p>
                      <p className="text-lg font-semibold">{user.username}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border px-3 py-1">角色：{roleLabels[user.role]}</span>
                      <span className="rounded-full border px-3 py-1">狀態：{user.status}</span>
                      <span className="rounded-full border px-3 py-1">建立：{user.createdAt}</span>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">角色設定</p>
                        {user.role === "admin" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            <Crown className="h-3.5 w-3.5" />
                            目前為管理者
                          </span>
                        ) : null}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {roleOptions.map((option) => {
                          const Icon = option.icon;
                          const selected = (roleDrafts[user.id] ?? user.role) === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setRoleDrafts((prev) => ({
                                  ...prev,
                                  [user.id]: option.value,
                                }))
                              }
                              className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                                selected
                                  ? `${option.tone} shadow-sm`
                                  : "border-border bg-white hover:border-primary/40"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80">
                                  <Icon className="h-4 w-4" />
                                </span>
                                <div>
                                  <p className="text-sm font-semibold">{option.label}</p>
                                  <p className="text-xs text-muted-foreground">{option.description}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRoleSave(user.id)}
                          disabled={isSavingRole === user.id}
                          className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          {isSavingRole === user.id ? "更新中..." : "更新角色"}
                        </button>
                        {user.role !== "admin" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAdminConfirmTarget(user.id);
                              setError("");
                              setStatus("");
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition"
                          >
                            <Crown className="h-4 w-4" />
                            升級為管理者
                          </button>
                        ) : null}
                      </div>
                      {adminConfirmTarget === user.id && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                            <AlertCircle className="h-4 w-4" />
                            將此帳號升級為管理者（最高權限）
                          </div>
                          <p className="text-xs text-amber-700">
                            管理者可修改其他使用者角色與密碼，請確認權限指派正確。
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleAdminUpgrade(user.id)}
                              disabled={isSavingRole === user.id}
                              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400 transition disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {isSavingRole === user.id ? "升級中..." : "確認升級"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdminConfirmTarget(null)}
                              className="inline-flex items-center gap-2 rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold">密碼重設</p>
                      <button
                        type="button"
                        onClick={() => {
                          setResetTarget(user.id);
                          setResetPassword("");
                          setResetConfirm("");
                          setError("");
                          setStatus("");
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition"
                      >
                        <KeyRound className="h-4 w-4" />
                        選擇此帳號重設密碼
                      </button>
                    </div>
                  </div>

                  {resetTarget === user.id && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                        <AlertCircle className="h-4 w-4" />
                        正在重設 {user.username} 的密碼
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          type="password"
                          name="reset-password"
                          placeholder="新密碼（至少 8 碼）"
                          value={resetPassword}
                          onChange={(event) => setResetPassword(event.target.value)}
                          autoComplete="new-password"
                          className="w-full rounded-xl border border-amber-200 bg-white/90 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                        <input
                          type="password"
                          name="reset-password-confirm"
                          placeholder="確認新密碼"
                          value={resetConfirm}
                          onChange={(event) => setResetConfirm(event.target.value)}
                          autoComplete="new-password"
                          className="w-full rounded-xl border border-amber-200 bg-white/90 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleResetPassword}
                          disabled={isResetting}
                          className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400 transition disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isResetting ? "重設中..." : "確認重設"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetTarget(null)}
                          className="inline-flex items-center gap-2 rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  沒有符合條件的使用者。
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
