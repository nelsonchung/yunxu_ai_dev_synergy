import { Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { getSession, logoutAccount, onSessionChange, type AuthUser } from "@/lib/authClient";
import { getMyPermissions } from "@/lib/permissionsClient";

const anchorItems = [
  { label: "核心理念", href: "/#core", type: "anchor" },
  { label: "流程設計", href: "/#process", type: "anchor" },
  { label: "AI 角色", href: "/#ai", type: "anchor" },
  { label: "合作模式", href: "/#collaboration", type: "anchor" },
  { label: "品牌介紹", href: "/#brand", type: "anchor" },
];

const customerRoutes = [
  { label: "需求中心", href: "/requirements", type: "route" },
  { label: "我的需求", href: "/my/requirements", type: "route" },
];

const developerRoutes = [
  { label: "需求中心", href: "/requirements", type: "route" },
  { label: "專案工作台", href: "/workspace", type: "route" },
];

const adminRoutes = [
  { label: "需求中心", href: "/requirements", type: "route" },
  { label: "媒合估工", href: "/matching", type: "route" },
  { label: "專案工作台", href: "/workspace", type: "route" },
  { label: "專案管理", href: "/projects", type: "route" },
  { label: "協作開發", href: "/collaboration", type: "route" },
  { label: "文件中心", href: "/documents", type: "route" },
  { label: "品質交付", href: "/quality", type: "route" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [accountUser, setAccountUser] = useState<AuthUser | null>(null);
  const [canSubmitRequirement, setCanSubmitRequirement] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;
    const syncSession = async () => {
      const session = await getSession();
      if (active) setAccountUser(session);
      if (!session) {
        if (active) setCanSubmitRequirement(false);
        return;
      }
      try {
        const permissionData = await getMyPermissions();
        if (active) {
          setCanSubmitRequirement(
            session.role === "admin" || permissionData.permissions.includes("requirements.create")
          );
        }
      } catch {
        if (active) {
          setCanSubmitRequirement(session.role === "admin");
        }
      }
    };
    const unsubscribe = onSessionChange(syncSession);
    syncSession();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await logoutAccount();
    setAccountUser(null);
    setLocation("/");
  };

  const isLoggedIn = Boolean(accountUser);
  const isAdmin = accountUser?.role === "admin";
  const showRequestCta = !accountUser || canSubmitRequirement;
  const requestHref = accountUser ? "/request" : "/auth";
  const requestLabel = accountUser ? "提交需求" : "登入後提交需求";
  const navItems = useMemo(() => {
    if (!accountUser) return anchorItems;
    if (accountUser.role === "customer") return [...anchorItems, ...customerRoutes];
    if (accountUser.role === "developer") return [...anchorItems, ...developerRoutes];
    return [...anchorItems, ...adminRoutes];
  }, [accountUser]);

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/70 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-2xl font-bold text-primary">鋆旭 AI-Dev</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          {navItems.map((item) =>
            item.type === "route" ? (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </a>
            )
          )}
          {isAdmin ? (
            <>
              <Link href="/admin/users" className="text-muted-foreground hover:text-primary transition-colors">
                使用者管理
              </Link>
              <Link
                href="/admin/permissions"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                角色權限
              </Link>
              <Link href="/admin/audit" className="text-muted-foreground hover:text-primary transition-colors">
                稽核紀錄
              </Link>
            </>
          ) : null}
          {isLoggedIn ? (
            <button
              type="button"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              登出({accountUser?.username ?? "使用者"})
            </button>
          ) : (
            <Link href="/auth" className="text-muted-foreground hover:text-primary transition-colors">
              登入 / 註冊
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showRequestCta ? (
            <Link
              href={requestHref}
              className="hidden md:inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
            >
              {requestLabel}
            </Link>
          ) : null}
          <button
            type="button"
            className="md:hidden rounded-full border border-border p-2 text-foreground"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "關閉選單" : "開啟選單"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="md:hidden border-t bg-white/90 backdrop-blur">
          <div className="container flex flex-col gap-4 py-6">
            {navItems.map((item) =>
              item.type === "route" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-base font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-base font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              )
            )}
            {isAdmin ? (
              <>
                <Link
                  href="/admin/users"
                  className="text-base font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setOpen(false)}
                >
                  使用者管理
                </Link>
                <Link
                  href="/admin/permissions"
                  className="text-base font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setOpen(false)}
                >
                  角色權限
                </Link>
                <Link
                  href="/admin/audit"
                  className="text-base font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setOpen(false)}
                >
                  稽核紀錄
                </Link>
              </>
            ) : null}
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  handleLogout();
                }}
                className="inline-flex items-center justify-center rounded-full border border-primary/30 px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
              >
                登出({accountUser?.username ?? "使用者"})
              </button>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center justify-center rounded-full border border-primary/30 px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
                onClick={() => setOpen(false)}
              >
                登入 / 註冊
              </Link>
            )}
            {showRequestCta ? (
              <Link
                href={requestHref}
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
                onClick={() => setOpen(false)}
              >
                {requestLabel}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
