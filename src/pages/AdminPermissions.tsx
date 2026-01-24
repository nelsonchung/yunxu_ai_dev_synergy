import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Save, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/authClient";
import {
  getRolePermissions,
  updateRolePermissions,
  type PermissionDefinition,
  type RolePermissions,
} from "@/lib/permissionsClient";

const roleLabels: Record<keyof RolePermissions, string> = {
  customer: "客戶",
  developer: "開發團隊",
};

const emptyRoles: RolePermissions = {
  customer: [],
  developer: [],
};

export default function AdminPermissions() {
  const [definitions, setDefinitions] = useState<PermissionDefinition[]>([]);
  const [roles, setRoles] = useState<RolePermissions>(emptyRoles);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError("");
      setStatus("");
      const data = await getRolePermissions();
      setDefinitions(data.definitions);
      setRoles(data.roles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入權限設定。");
    } finally {
      setIsLoading(false);
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

  const groupedDefinitions = useMemo(() => {
    return definitions.reduce<Record<string, PermissionDefinition[]>>((acc, item) => {
      const key = item.category || "其他";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [definitions]);

  const togglePermission = (role: keyof RolePermissions, permissionId: string) => {
    setRoles((prev) => {
      const nextSet = new Set(prev[role]);
      if (nextSet.has(permissionId)) {
        nextSet.delete(permissionId);
      } else {
        nextSet.add(permissionId);
      }
      return { ...prev, [role]: Array.from(nextSet) };
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError("");
      setStatus("");
      const updated = await updateRolePermissions(roles);
      setRoles(updated);
      setStatus("已更新角色權限。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新權限失敗。");
    } finally {
      setIsSaving(false);
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
            <h1 className="font-serif text-3xl md:text-4xl font-bold">角色權限設定</h1>
            <p className="text-muted-foreground">
              設定客戶與開發團隊可執行的功能，管理者預設擁有全部權限。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
            >
              <RefreshCcw className="h-4 w-4" />
              重新整理
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isAdmin}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              儲存設定
            </button>
          </div>
        </div>

        {!isAdmin ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            僅管理者可調整角色權限，請先使用管理者帳號登入。
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

        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-6">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              正在載入權限設定...
            </div>
          ) : (
            Object.entries(groupedDefinitions).map(([category, items]) => (
              <div key={category} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl font-bold">{category}</h2>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{roleLabels.customer}</span>
                    <span>{roleLabels.developer}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {items.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white/90 p-4"
                    >
                      <div>
                        <p className="font-semibold">{permission.label}</p>
                        <p className="text-xs text-muted-foreground">{permission.description}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        {(Object.keys(roleLabels) as Array<keyof RolePermissions>).map((role) => (
                          <label key={role} className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={roles[role].includes(permission.id)}
                              onChange={() => togglePermission(role, permission.id)}
                              disabled={!isAdmin}
                              className="h-4 w-4 rounded border border-border"
                            />
                            <span className="text-muted-foreground">{roleLabels[role]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
