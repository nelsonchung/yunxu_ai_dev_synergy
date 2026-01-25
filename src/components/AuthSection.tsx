import { useEffect, useState } from "react";
import { CircleCheck, LogOut, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Link } from "wouter";
import {
  getSession,
  loginAccount,
  logoutAccount,
  onSessionChange,
  registerAccount,
  type AuthUser,
} from "@/lib/authClient";

const loginHighlights = [
  {
    title: "安全登入",
    description: "採用伺服器端密碼驗證與 Session 機制。",
    icon: ShieldCheck,
  },
  {
    title: "快速啟動",
    description: "登入後即可進入需求對談與媒合流程。",
    icon: Sparkles,
  },
  {
    title: "專案追蹤",
    description: "登入資訊用於專案聯繫與需求進度追蹤。",
    icon: UserRound,
  },
];

export default function AuthSection() {
  const [accountTab, setAccountTab] = useState<"login" | "register">("login");
  const [accountUsername, setAccountUsername] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountConfirm, setAccountConfirm] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountUser, setAccountUser] = useState<AuthUser | null>(null);
  const [isAccountBusy, setIsAccountBusy] = useState(false);

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


  const resetAccountFeedback = () => {
    setAccountStatus("");
    setAccountError("");
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateUsername = (username: string) => /^[a-zA-Z0-9_]{3,20}$/.test(username);

  const handleRegister = async () => {
    resetAccountFeedback();
    setIsAccountBusy(true);
    setAccountStatus("註冊中...");
    const username = accountUsername.trim();
    const email = accountEmail.trim();
    const password = accountPassword.trim();
    const confirm = accountConfirm.trim();

    if (!username || !email || !password || !confirm) {
      setAccountError("請完整填寫帳號、Email 與密碼欄位。");
      setAccountStatus("");
      setIsAccountBusy(false);
      return;
    }
    if (!validateUsername(username)) {
      setAccountError("帳號需為 3-20 字英數或底線，且不可包含空白。");
      setAccountStatus("");
      setIsAccountBusy(false);
      return;
    }
    if (!validateEmail(email)) {
      setAccountError("Email 格式不正確，請重新輸入。");
      setAccountStatus("");
      setIsAccountBusy(false);
      return;
    }
    if (password.length < 8) {
      setAccountError("密碼至少 8 碼，建議包含英數組合。");
      setAccountStatus("");
      setIsAccountBusy(false);
      return;
    }
    if (password !== confirm) {
      setAccountError("密碼與確認密碼不一致。");
      setAccountStatus("");
      setIsAccountBusy(false);
      return;
    }

    try {
      const userInfo = await registerAccount({
        username,
        email,
        password,
        confirmPassword: confirm,
      });
      if (!userInfo) {
        throw new Error("註冊成功，但未取得使用者資訊。");
      }
      setAccountUser(userInfo);
      const session = await getSession();
      if (session) {
        setAccountUser(session);
      }
      setAccountStatus("註冊成功，已登入。");
      setAccountPassword("");
      setAccountConfirm("");
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "註冊失敗，請稍後再試。");
      setAccountStatus("");
    } finally {
      setIsAccountBusy(false);
    }
  };

  const handleAccountLogin = async () => {
    resetAccountFeedback();
    setIsAccountBusy(true);
    setAccountStatus("登入中...");
    const username = accountUsername.trim();
    const password = accountPassword.trim();

    if (!username || !password) {
      setAccountError("請輸入帳號與密碼。");
      setAccountStatus("");
      setIsAccountBusy(false);
      return;
    }

    try {
      const userInfo = await loginAccount({ identifier: username, password });
      setAccountUser(userInfo);
      setAccountStatus("登入成功。");
      setAccountPassword("");
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "登入失敗，請稍後再試。");
      setAccountStatus("");
    } finally {
      setIsAccountBusy(false);
    }
  };

  const handleAccountLogout = async () => {
    try {
      await logoutAccount();
      setAccountUser(null);
      setAccountStatus("已登出。");
    } catch {
      setAccountError("登出失敗，請稍後再試。");
    }
  };

  return (
    <section className="scroll-mt-24 py-20 bg-gradient-to-b from-background via-secondary/40 to-background">
      <div className="container">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-start">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              會員登入
            </span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold">帳號密碼登入，快速啟動專案</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              使用帳號密碼登入後，即可進入需求對談、媒合與專案追蹤流程。
            </p>

            <div className="grid gap-4">
              {loginHighlights.map((item) => (
                <div key={item.title} className="flex items-start gap-4 rounded-2xl border bg-card p-5">
                  <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center border">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{item.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border bg-card p-8 shadow-lg space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-serif text-2xl font-bold">帳號密碼登入</h3>
                  <p className="text-sm text-muted-foreground">
                    使用帳號密碼登入，帳號資料會保存在伺服器，可跨裝置使用。
                  </p>
                </div>
              </div>

              {accountUser ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <CircleCheck className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-semibold">已登入</p>
                      <p className="text-sm text-muted-foreground">
                        {accountUser.username} · {accountUser.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/requirements"
                      className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
                    >
                      前往需求中心
                    </Link>
                    <button
                      type="button"
                      onClick={handleAccountLogout}
                      className="inline-flex items-center justify-center rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      登出
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="inline-flex rounded-full border border-border bg-secondary/60 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountTab("login");
                        resetAccountFeedback();
                      }}
                      className={`rounded-full px-4 py-1 transition ${
                        accountTab === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      登入
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountTab("register");
                        resetAccountFeedback();
                      }}
                      className={`rounded-full px-4 py-1 transition ${
                        accountTab === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      註冊
                    </button>
                  </div>

                  <label className="space-y-2 text-sm font-medium">
                    帳號
                    <input
                      type="text"
                      name="username"
                      placeholder="3-20 字英數或底線"
                      value={accountUsername}
                      onChange={(event) => setAccountUsername(event.target.value)}
                      className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </label>

                  {accountTab === "register" && (
                    <label className="space-y-2 text-sm font-medium">
                      Email
                      <input
                        type="email"
                        name="email"
                        placeholder="name@company.com"
                        value={accountEmail}
                        onChange={(event) => setAccountEmail(event.target.value)}
                        className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </label>
                  )}

                  <label className="space-y-2 text-sm font-medium">
                    密碼
                    <input
                      type="password"
                      name="password"
                      placeholder="至少 8 碼"
                      value={accountPassword}
                      onChange={(event) => setAccountPassword(event.target.value)}
                      className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </label>

                  {accountTab === "register" && (
                    <label className="space-y-2 text-sm font-medium">
                      確認密碼
                      <input
                        type="password"
                        name="confirm"
                        placeholder="再次輸入密碼"
                        value={accountConfirm}
                        onChange={(event) => setAccountConfirm(event.target.value)}
                        className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </label>
                  )}

                  <button
                    type="button"
                    onClick={accountTab === "register" ? handleRegister : handleAccountLogin}
                    disabled={isAccountBusy}
                    className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/10 hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isAccountBusy
                      ? accountTab === "register"
                        ? "註冊中..."
                        : "登入中..."
                      : accountTab === "register"
                      ? "註冊並登入"
                      : "帳號登入"}
                  </button>
                </div>
              )}

              {(accountStatus || accountError) && (
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    accountError
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {accountError || accountStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
