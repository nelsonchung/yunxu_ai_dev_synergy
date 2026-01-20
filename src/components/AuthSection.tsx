import { useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import {
  CircleCheck,
  LogOut,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { firebaseAuth } from "@/lib/firebase";
import { Link, useLocation } from "wouter";

const loginHighlights = [
  {
    title: "安全驗證",
    description: "採用 Firebase reCAPTCHA 與簡訊驗證，確保登入安全。",
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
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState("");
  const [authError, setAuthError] = useState("");
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const [, setLocation] = useLocation();

  const readErrorCode = (error: unknown) => {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      return typeof code === "string" ? code : null;
    }
    return null;
  };

  const initRecaptcha = () => {
    if (recaptchaRef.current) return;
    if (typeof window === "undefined") return;

    recaptchaRef.current = new RecaptchaVerifier(
      firebaseAuth,
      "recaptcha-container",
      {
        size: "normal",
        "expired-callback": () => {
          setAuthError("reCAPTCHA 已過期，請重新驗證。");
        },
      }
    );

    recaptchaRef.current.render().catch(() => {
      setAuthError("reCAPTCHA 載入失敗，請重新整理後再試。");
    });
  };

  const resetRecaptcha = () => {
    if (recaptchaRef.current) {
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
    }
    initRecaptcha();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser ?? null);
      if (nextUser) {
        setAuthStatus("");
        setAuthError("");
        setAuthErrorCode(null);
        setConfirmation(null);
        setCode("");
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
      return;
    }
    initRecaptcha();
  }, [user]);

  const handleSendCode = async () => {
    setAuthStatus("");
    setAuthError("");
    setAuthErrorCode(null);

    const trimmedPhone = phone.trim();
    if (!trimmedPhone.startsWith("+")) {
      setAuthError("請使用國碼格式，例如 +886912345678。");
      return;
    }

    if (!recaptchaRef.current) {
      setAuthError("reCAPTCHA 尚未就緒，請稍後再試。");
      return;
    }

    try {
      setIsSending(true);
      const result = await signInWithPhoneNumber(
        firebaseAuth,
        trimmedPhone,
        recaptchaRef.current
      );
      setConfirmation(result);
      setAuthStatus("驗證碼已送出，請查看簡訊。");
    } catch (error) {
      console.error(error);
      const errorCode = readErrorCode(error);
      setAuthError("驗證碼發送失敗，請確認手機號碼與簡訊額度。");
      setAuthErrorCode(errorCode);
      resetRecaptcha();
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async () => {
    setAuthStatus("");
    setAuthError("");
    setAuthErrorCode(null);

    if (!confirmation) {
      setAuthError("請先取得驗證碼。");
      return;
    }

    if (!code.trim()) {
      setAuthError("請輸入簡訊驗證碼。");
      return;
    }

    try {
      setIsVerifying(true);
      await confirmation.confirm(code.trim());
      setAuthStatus("登入成功。");
      setCode("");
    } catch (error) {
      console.error(error);
      const errorCode = readErrorCode(error);
      setAuthError("驗證碼錯誤或已過期，請重新取得。");
      setAuthErrorCode(errorCode);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    setAuthStatus("");
    setAuthError("");
    setAuthErrorCode(null);
    await signOut(firebaseAuth);
    setLocation("/");
  };

  return (
    <section className="scroll-mt-24 py-20 bg-gradient-to-b from-background via-secondary/40 to-background">
      <div className="container">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-start">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              會員登入
            </span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold">使用電信業者登入，快速啟動專案</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              使用手機號碼登入後，我們能更有效率地安排需求訪談與媒合流程。登入資訊僅用於專案聯繫。
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
              <div className="space-y-2">
                <h3 className="font-serif text-2xl font-bold">手機驗證登入</h3>
                <p className="text-sm text-muted-foreground">
                  Firebase 會透過簡訊送出驗證碼。請使用國碼格式輸入手機號碼。
                </p>
              </div>

              {user ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <CircleCheck className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-semibold">已登入</p>
                      <p className="text-sm text-muted-foreground">{user.phoneNumber || "已驗證帳號"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/request">
                      <a className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition">
                        前往提交需求
                      </a>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center justify-center rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      登出
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="space-y-2 text-sm font-medium">
                    手機號碼
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-white/90 px-4 py-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="tel"
                        name="phone"
                        placeholder="+886912345678"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        className="w-full bg-transparent text-sm focus:outline-none"
                      />
                    </div>
                  </label>
                  <div id="recaptcha-container" className="rounded-2xl border border-dashed p-3" />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isSending}
                    className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/10 hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSending ? "傳送中..." : "發送驗證碼"}
                  </button>
                  <label className="space-y-2 text-sm font-medium">
                    簡訊驗證碼
                    <input
                      type="text"
                      name="code"
                      placeholder="輸入 6 位數驗證碼"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={isVerifying}
                    className="inline-flex w-full items-center justify-center rounded-full border border-primary/30 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isVerifying ? "驗證中..." : "確認登入"}
                  </button>
                </div>
              )}

              {!user && (authStatus || authError) && (
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    authError
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <p>{authError || authStatus}</p>
                  {authError && authErrorCode && (
                    <p className="mt-2 text-xs text-red-600">錯誤代碼：{authErrorCode}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
