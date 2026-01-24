import { useEffect, useState } from "react";
import { Mail, MapPin, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getSession, logoutAccount, onSessionChange, type AuthUser } from "@/lib/authClient";

const links = [
  { label: "核心理念", href: "/#core", type: "anchor" },
  { label: "流程設計", href: "/#process", type: "anchor" },
  { label: "AI 角色", href: "/#ai", type: "anchor" },
  { label: "合作模式", href: "/#collaboration", type: "anchor" },
  { label: "品牌介紹", href: "/#brand", type: "anchor" },
  { label: "專案管理", href: "/projects", type: "route" },
];

export default function Footer() {
  const [accountUser, setAccountUser] = useState<AuthUser | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;
    const syncSession = async () => {
      const session = await getSession();
      if (active) setAccountUser(session);
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

  return (
    <footer className="border-t bg-secondary/50">
      <div className="container py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-bold text-primary">鋆旭 AI-Dev</h3>
            <p className="text-muted-foreground leading-relaxed">
              以 CMMI 標準流程結合 AI 協作，提供需求澄清、開發媒合與交付品質的軟體外包平台。
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              AI + 流程化協作，讓外包更安心
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">快速連結</h4>
            <ul className="space-y-2 text-sm">
              {links.map((link) => (
                <li key={link.href}>
                  {link.type === "route" ? (
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className="text-muted-foreground hover:text-primary transition">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
              <li>
                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-muted-foreground hover:text-primary transition"
                  >
                    登出
                  </button>
                ) : (
                  <Link href="/auth" className="text-muted-foreground hover:text-primary transition">
                    登入 / 註冊
                  </Link>
                )}
              </li>
              {isAdmin ? (
                <li>
                  <Link href="/admin/users" className="text-muted-foreground hover:text-primary transition">
                    使用者管理
                  </Link>
                </li>
              ) : null}
              <li>
                <Link href="/request" className="text-muted-foreground hover:text-primary transition">
                  提交需求
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">聯絡資訊</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-0.5 text-primary" />
                <span>台灣・亞太遠端協作</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <a href="mailto:hello@yunxu.com.tw" className="hover:text-primary transition">
                  hello@yunxu.com.tw
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} 鋆旭 AI-Dev. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
