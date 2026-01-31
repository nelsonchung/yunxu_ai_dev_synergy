import { createContext, useContext, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { getSession, type AuthUser } from "@/lib/authClient";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  HelpCircle,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Users,
  Workflow,
  Bell,
  DollarSign,
  BarChart3,
  ExternalLink,
  X,
} from "lucide-react";

type TabId = "quickstart" | "roles" | "workflow" | "documents" | "status" | "faq";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "quickstart", label: "快速入門", icon: Rocket },
  { id: "roles", label: "角色與權限", icon: Users },
  { id: "workflow", label: "完整流程", icon: Workflow },
  { id: "documents", label: "文件與簽核", icon: FileText },
  { id: "status", label: "狀態說明", icon: BarChart3 },
  { id: "faq", label: "常見問題", icon: HelpCircle },
];

// 權限要求定義
const routePermissions: Record<string, { allowedRoles: string[]; denyMessage: string }> = {
  "/my/requirements": {
    allowedRoles: ["customer", "admin"],
    denyMessage: "此頁面僅供客戶或管理員權限瀏覽",
  },
  "/workspace": {
    allowedRoles: ["developer", "admin"],
    denyMessage: "此頁面僅供開發者權限瀏覽",
  },
};

// Context 傳遞用戶角色和對話框控制
type GuideContextType = {
  userRole: string | null;
  showAccessDenied: (message: string) => void;
};
const GuideContext = createContext<GuideContextType>({
  userRole: null,
  showAccessDenied: () => {},
});

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const { userRole, showAccessDenied } = useContext(GuideContext);
  const [, setLocation] = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    const permission = routePermissions[href];
    if (permission) {
      // 檢查是否有權限
      if (!userRole || !permission.allowedRoles.includes(userRole)) {
        e.preventDefault();
        showAccessDenied(permission.denyMessage);
        return;
      }
    }
    // 有權限或無需權限檢查，正常導航
    e.preventDefault();
    setLocation(href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-primary hover:underline font-medium cursor-pointer"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function QuickLinkButton({
  href,
  icon: Icon,
  label,
  userRole,
  showAccessDenied,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  userRole: string | null;
  showAccessDenied: (message: string) => void;
}) {
  const [, setLocation] = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const permission = routePermissions[href];
    if (permission) {
      if (!userRole || !permission.allowedRoles.includes(userRole)) {
        showAccessDenied(permission.denyMessage);
        return;
      }
    }
    setLocation(href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition cursor-pointer"
    >
      <Icon className="h-5 w-5 text-primary" />
      <span className="font-medium">{label}</span>
    </a>
  );
}

function QuickLinks({
  userRole,
  showAccessDenied,
}: {
  userRole: string | null;
  showAccessDenied: (message: string) => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="font-serif text-lg font-bold mb-4">快速連結</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLinkButton
          href="/request"
          icon={ClipboardCheck}
          label="提交需求"
          userRole={userRole}
          showAccessDenied={showAccessDenied}
        />
        <QuickLinkButton
          href="/my/requirements"
          icon={FileText}
          label="我的需求"
          userRole={userRole}
          showAccessDenied={showAccessDenied}
        />
        <QuickLinkButton
          href="/notifications"
          icon={Bell}
          label="通知中心"
          userRole={userRole}
          showAccessDenied={showAccessDenied}
        />
        <QuickLinkButton
          href="/support"
          icon={MessageSquare}
          label="客服中心"
          userRole={userRole}
          showAccessDenied={showAccessDenied}
        />
      </div>
    </div>
  );
}

function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary/50 transition text-left"
      >
        <span className="font-semibold">{title}</span>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="p-4 bg-card">{children}</div>}
    </div>
  );
}

function QuickStartTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <h3 className="font-serif text-xl font-bold">客戶 5 分鐘上手</h3>
        </div>
        <div className="grid gap-3">
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
              1
            </span>
            <div>
              <p className="font-medium">註冊帳號</p>
              <p className="text-sm text-muted-foreground">
                前往 <NavLink href="/auth">登入/註冊頁面</NavLink>，使用手機號碼完成註冊。
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
              2
            </span>
            <div>
              <p className="font-medium">提交需求</p>
              <p className="text-sm text-muted-foreground">
                前往 <NavLink href="/request">提交需求頁面</NavLink>，填寫需求背景、目標、範圍、預算與時程。
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
              3
            </span>
            <div>
              <p className="font-medium">等待報價</p>
              <p className="text-sm text-muted-foreground">
                開發者撰寫系統文件後會產生報價，您會在 <NavLink href="/notifications">通知中心</NavLink> 收到通知。
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
              4
            </span>
            <div>
              <p className="font-medium">簽核與追蹤</p>
              <p className="text-sm text-muted-foreground">
                在 <NavLink href="/my/requirements">我的需求</NavLink> 簽核文件、審核報價、追蹤開發進度。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-green-500" />
          </div>
          <h3 className="font-serif text-xl font-bold">開發者 5 分鐘上手</h3>
        </div>
        <div className="grid gap-3">
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
              1
            </span>
            <div>
              <p className="font-medium">註冊並申請角色</p>
              <p className="text-sm text-muted-foreground">
                前往 <NavLink href="/auth">登入/註冊頁面</NavLink> 註冊，並聯繫管理員申請開發者角色。
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
              2
            </span>
            <div>
              <p className="font-medium">查看指派需求</p>
              <p className="text-sm text-muted-foreground">
                在 <NavLink href="/requirements">需求列表</NavLink> 查看所有客戶提出的需求。
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
              3
            </span>
            <div>
              <p className="font-medium">撰寫文件與報價</p>
              <p className="text-sm text-muted-foreground">
                在需求詳情頁撰寫系統架構、軟體設計文件，並產生報價送交客戶審核。
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
              4
            </span>
            <div>
              <p className="font-medium">開發與驗證</p>
              <p className="text-sm text-muted-foreground">
                報價核准後在 <NavLink href="/workspace">專業工作台</NavLink> 更新開發清單與系統驗證進度。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RolesTab() {
  const roles = [
    {
      name: "客戶",
      color: "blue",
      description: "提出需求、審核報價、簽核文件、追蹤進度的角色。",
      permissions: [
        { action: "提交需求", link: "/request" },
        { action: "查看我的需求", link: "/my/requirements" },
        { action: "簽核文件（需求/架構/設計/測試/使用說明）", link: null },
        { action: "審核報價", link: null },
        { action: "追蹤開發與驗證進度", link: null },
        { action: "留言討論", link: null },
        { action: "聯繫客服", link: "/support" },
      ],
    },
    {
      name: "開發者",
      color: "green",
      description: "負責撰寫文件、提交報價、執行開發與測試的角色。",
      permissions: [
        { action: "查看所有需求", link: "/requirements" },
        { action: "撰寫系統架構/軟體設計/測試/使用說明文件", link: "/workspace" },
        { action: "產生與提交報價", link: "/workspace" },
        { action: "更新開發清單進度", link: "/workspace" },
        { action: "更新系統驗證清單", link: "/workspace" },
        { action: "留言討論", link: null },
      ],
    },
    {
      name: "管理員",
      color: "purple",
      description: "平台管理者，負責使用者管理、需求指派與權限設定。",
      permissions: [
        { action: "管理使用者", link: "/admin/users" },
        { action: "設定角色權限", link: "/admin/permissions" },
        { action: "審核需求", link: "/requirements" },
        { action: "查看稽核記錄", link: "/admin/audit" },
        { action: "處理客服訊息", link: "/support" },
      ],
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {roles.map((role) => (
        <div key={role.name} className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                role.color === "blue"
                  ? "bg-blue-500/10"
                  : role.color === "green"
                  ? "bg-green-500/10"
                  : "bg-purple-500/10"
              }`}
            >
              <Users
                className={`h-4 w-4 ${
                  role.color === "blue"
                    ? "text-blue-500"
                    : role.color === "green"
                    ? "text-green-500"
                    : "text-purple-500"
                }`}
              />
            </div>
            <h3 className="font-serif text-xl font-bold">{role.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{role.description}</p>
          <div className="space-y-2">
            <p className="text-sm font-medium">可執行操作：</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {role.permissions.map((perm) => (
                <li key={perm.action} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                  {perm.link ? (
                    <NavLink href={perm.link}>{perm.action}</NavLink>
                  ) : (
                    <span>{perm.action}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkflowTab() {
  const steps = [
    {
      phase: "需求階段",
      icon: ClipboardCheck,
      items: [
        {
          title: "客戶提交需求",
          description: "填寫需求背景、目標、功能範圍、預算與時程期望。",
          link: "/request",
          actor: "客戶",
        },
        {
          title: "管理員審核需求",
          description: "確認需求完整性，必要時請客戶補充資訊。",
          link: "/requirements",
          actor: "管理員",
        },
        {
          title: "指派開發者",
          description: "根據技術需求媒合適合的開發者。",
          link: null,
          actor: "管理員",
        },
      ],
    },
    {
      phase: "文件階段",
      icon: FileText,
      items: [
        {
          title: "撰寫系統架構文件",
          description: "定義技術選型、模組劃分、介面規格。",
          link: null,
          actor: "開發者",
        },
        {
          title: "客戶簽核系統架構",
          description: "確認架構方向符合需求。",
          link: "/my/requirements",
          actor: "客戶",
        },
        {
          title: "撰寫軟體設計文件",
          description: "細部設計、API 規格、資料庫設計、功能清單。",
          link: null,
          actor: "開發者",
        },
        {
          title: "客戶簽核軟體設計",
          description: "確認設計細節與驗收標準。",
          link: "/my/requirements",
          actor: "客戶",
        },
        {
          title: "展開軟體開發項目",
          description: "軟體設計簽核後，系統自動展開開發項目清單。",
          link: null,
          actor: "系統",
        },
        {
          title: "撰寫系統驗證文件",
          description: "定義測試案例、測試計畫與驗收標準。",
          link: null,
          actor: "開發者",
        },
        {
          title: "客戶簽核系統驗證文件",
          description: "確認測試範圍涵蓋所有需求。",
          link: "/my/requirements",
          actor: "客戶",
        },
        {
          title: "展開系統驗證項目",
          description: "系統驗證文件簽核後，系統自動展開驗證項目清單。",
          link: null,
          actor: "系統",
        },
      ],
    },
    {
      phase: "報價階段",
      icon: DollarSign,
      items: [
        {
          title: "產生報價",
          description: "基於軟體設計文件的功能項目，開發者進行評估，系統自動計算報價總和。",
          link: null,
          actor: "開發者",
        },
        {
          title: "客戶審核報價",
          description: "同意報價或提出修改建議。",
          link: "/my/requirements",
          actor: "客戶",
        },
        {
          title: "產生開發清單",
          description: "報價核准後，系統自動產生開發 checklist。",
          link: null,
          actor: "系統",
        },
      ],
    },
    {
      phase: "開發階段",
      icon: Workflow,
      items: [
        {
          title: "執行開發任務",
          description: "依開發清單逐項完成功能開發。",
          link: "/workspace",
          actor: "開發者",
        },
        {
          title: "更新開發進度",
          description: "勾選完成項目，進度自動同步給客戶。請進入協作細節。",
          link: "/workspace",
          actor: "開發者",
        },
        {
          title: "客戶追蹤開發進度",
          description: "在「我的需求」即時查看開發進度百分比。",
          link: "/my/requirements",
          actor: "客戶",
        },
      ],
    },
    {
      phase: "驗證階段",
      icon: ShieldCheck,
      items: [
        {
          title: "執行系統驗證",
          description: "依系統驗證清單逐項確認功能正確性。",
          link: "/workspace",
          actor: "開發者",
        },
        {
          title: "更新驗證進度",
          description: "勾選完成項目，進度自動同步給客戶。請在專案工作台更新。",
          link: "/workspace",
          actor: "開發者",
        },
        {
          title: "客戶追蹤驗證進度",
          description: "在「我的需求」即時查看開發進度百分比。",
          link: "/my/requirements",
          actor: "客戶",
        },
      ],
    },
    {
      phase: "交付階段",
      icon: Rocket,
      items: [
        {
          title: "撰寫使用說明文件",
          description: "整理完整使用說明，提供客戶驗收。",
          link: null,
          actor: "開發者",
        },
        {
          title: "客戶最終簽核",
          description: "確認交付成果符合驗收標準。",
          link: "/my/requirements",
          actor: "客戶",
        },
        {
          title: "專案結案",
          description: "完成所有文件歸檔與交接。",
          link: null,
          actor: "管理員",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {steps.map((phase) => (
        <div key={phase.phase} className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center gap-3 p-4 bg-secondary/30 border-b">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <phase.icon className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-serif text-lg font-bold">{phase.phase}</h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {phase.items.map((item, index) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </div>
                    {index < phase.items.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border mt-1" />
                    )}
                  </div>
                  <div className="pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{item.title}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          item.actor === "客戶"
                            ? "bg-blue-500/10 text-blue-600"
                            : item.actor === "開發者"
                            ? "bg-green-500/10 text-green-600"
                            : item.actor === "管理員"
                            ? "bg-purple-500/10 text-purple-600"
                            : "bg-gray-500/10 text-gray-600"
                        }`}
                      >
                        {item.actor}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                      {item.link && (
                        <>
                          {" "}
                          <NavLink href={item.link}>前往操作</NavLink>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentsTab() {
  const docTypes = [
    {
      name: "需求規格文件",
      purpose: "定義功能範圍、使用情境與驗收標準",
      author: "客戶填寫，管理員審核",
      content: ["需求背景與目標", "功能清單", "非功能需求", "預算與時程", "驗收標準"],
    },
    {
      name: "系統架構文件",
      purpose: "定義技術選型與整體架構",
      author: "開發者撰寫，客戶簽核",
      content: ["技術選型說明", "系統模組劃分", "介面規格", "部署架構", "安全考量"],
    },
    {
      name: "軟體設計文件",
      purpose: "細部設計與實作規格",
      author: "開發者撰寫，客戶簽核",
      content: ["功能細部設計", "API 規格", "資料庫設計", "UI/UX 設計", "開發項目清單"],
    },
    {
      name: "測試文件",
      purpose: "定義測試範圍與驗證方法",
      author: "開發者撰寫，客戶簽核",
      content: ["測試計畫", "測試案例", "驗收測試項目", "效能測試標準"],
    },
    {
      name: "使用說明文件",
      purpose: "確保使用方式清楚、交接順暢",
      author: "開發者撰寫，客戶簽核",
      content: ["使用說明", "操作步驟", "常見問題", "版本記錄"],
    },
  ];

  const signoffFlow = [
    { status: "草稿", description: "開發者撰寫中，尚未送出審核", color: "gray" },
    { status: "待簽核", description: "已送出，等待客戶審核", color: "yellow" },
    { status: "已核准", description: "客戶同意，可進入下一階段", color: "green" },
    { status: "退回修改", description: "客戶要求修改，需重新送審", color: "red" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-serif text-xl font-bold mb-4">文件類型與用途</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {docTypes.map((doc) => (
            <div key={doc.name} className="rounded-2xl border bg-card p-5 space-y-3">
              <h4 className="font-semibold text-lg">{doc.name}</h4>
              <p className="text-sm text-muted-foreground">{doc.purpose}</p>
              <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full inline-block">
                {doc.author}
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {doc.content.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-serif text-xl font-bold mb-4">簽核狀態說明</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {signoffFlow.map((item) => (
            <div key={item.status} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`h-3 w-3 rounded-full ${
                    item.color === "gray"
                      ? "bg-gray-400"
                      : item.color === "yellow"
                      ? "bg-yellow-400"
                      : item.color === "green"
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                />
                <span className="font-medium">{item.status}</span>
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-secondary/30 p-6">
        <h3 className="font-serif text-lg font-bold mb-3">簽核操作位置</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            • 客戶：在 <NavLink href="/my/requirements">我的需求</NavLink> 的「文件與簽核」分頁進行簽核
          </li>
          <li>
            • 開發者：在需求詳情頁撰寫文件後點擊「送出審核」
          </li>
          <li>
            • 所有簽核動作會記錄於 <NavLink href="/admin/audit">稽核記錄</NavLink>（管理員可查看）
          </li>
        </ul>
      </div>
    </div>
  );
}

function StatusTab() {
  const statusGroups = [
    {
      category: "需求狀態",
      statuses: [
        { name: "草稿", description: "客戶尚未送出的需求", color: "gray" },
        { name: "待審核", description: "已送出，等待管理員審核", color: "yellow" },
        { name: "進行中", description: "已指派開發者，開發中", color: "blue" },
        { name: "已完成", description: "所有文件簽核完成，專案結案", color: "green" },
        { name: "已取消", description: "需求被取消或退回", color: "red" },
      ],
    },
    {
      category: "報價狀態",
      statuses: [
        { name: "待審核", description: "報價已送出，等待客戶審核", color: "yellow" },
        { name: "已核准", description: "客戶同意報價，產生開發清單", color: "green" },
        { name: "需修改", description: "客戶要求調整報價內容", color: "orange" },
      ],
    },
    {
      category: "通知類型",
      statuses: [
        { name: "文件待簽核", description: "有新文件需要您簽核", color: "blue" },
        { name: "報價待審核", description: "開發者已提交報價", color: "purple" },
        { name: "簽核結果", description: "您的文件/報價已被審核", color: "green" },
        { name: "留言通知", description: "有人在需求/文件中留言", color: "gray" },
        { name: "進度更新", description: "開發/驗證清單有新進度", color: "blue" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {statusGroups.map((group) => (
        <div key={group.category} className="rounded-2xl border bg-card p-6">
          <h3 className="font-serif text-lg font-bold mb-4">{group.category}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.statuses.map((status) => (
              <div key={status.name} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30">
                <span
                  className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${
                    status.color === "gray"
                      ? "bg-gray-400"
                      : status.color === "yellow"
                      ? "bg-yellow-400"
                      : status.color === "blue"
                      ? "bg-blue-500"
                      : status.color === "green"
                      ? "bg-green-500"
                      : status.color === "red"
                      ? "bg-red-500"
                      : status.color === "orange"
                      ? "bg-orange-500"
                      : "bg-purple-500"
                  }`}
                />
                <div>
                  <p className="font-medium text-sm">{status.name}</p>
                  <p className="text-xs text-muted-foreground">{status.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-2xl border bg-secondary/30 p-6">
        <h3 className="font-serif text-lg font-bold mb-3">通知中心</h3>
        <p className="text-sm text-muted-foreground">
          所有通知會即時推送到 <NavLink href="/notifications">通知中心</NavLink>，
          您也可以在導航列看到未讀通知數量。點擊通知可直接跳轉到對應頁面。
        </p>
      </div>
    </div>
  );
}

function FaqTab() {
  const faqs = [
    {
      category: "帳號相關",
      questions: [
        {
          q: "如何註冊帳號？",
          a: (
            <>
              前往 <NavLink href="/auth">登入/註冊頁面</NavLink>，使用手機號碼完成註冊。
              註冊後預設為客戶角色，如需開發者權限請聯繫管理員。
            </>
          ),
        },
        {
          q: "忘記密碼怎麼辦？",
          a: "請聯繫平台管理員協助重設密碼，或透過客服中心提交請求。",
        },
        {
          q: "如何成為開發者？",
          a: (
            <>
              註冊後請透過 <NavLink href="/support">客服中心</NavLink> 聯繫管理員，
              提供您的技術背景，管理員審核後會調整您的角色權限。
            </>
          ),
        },
      ],
    },
    {
      category: "需求相關",
      questions: [
        {
          q: "如何修改已提交的需求？",
          a: (
            <>
              在 <NavLink href="/my/requirements">我的需求</NavLink> 找到該需求，
              若狀態為「草稿」可直接編輯；若已送審，請在留言區說明修改需求，
              管理員會協助處理。
            </>
          ),
        },
        {
          q: "需求被退回怎麼辦？",
          a: "查看退回原因（通常在留言區），補充或修改相關資訊後重新送出審核。",
        },
        {
          q: "可以同時提交多個需求嗎？",
          a: "可以，每個需求會獨立追蹤進度，您可以在「我的需求」統一管理。",
        },
      ],
    },
    {
      category: "報價與付款",
      questions: [
        {
          q: "報價是如何計算的？",
          a: "報價基於軟體設計文件中的功能項目，包含開發工時、測試、部署等成本。具體計算方式會在報價明細中說明。",
        },
        {
          q: "報價被我退回後會怎樣？",
          a: "開發者會收到通知並查看您的修改建議，調整後會重新提交報價供您審核。",
        },
        {
          q: "付款方式是什麼？",
          a: "目前採線下付款，報價核准後管理員會與您聯繫付款事宜。",
        },
      ],
    },
    {
      category: "開發與交付",
      questions: [
        {
          q: "如何追蹤開發進度？",
          a: (
            <>
              在 <NavLink href="/my/requirements">我的需求</NavLink> 可看到開發清單的完成百分比，
              點進需求詳情可查看每個開發項目的狀態。
            </>
          ),
        },
        {
          q: "文件簽核後可以修改嗎？",
          a: "已簽核的文件原則上不可修改，如有重大變更需求，請在留言區說明，管理員會協助評估是否開放修改。",
        },
        {
          q: "交付後發現問題怎麼辦？",
          a: (
            <>
              請在需求留言區描述問題，或透過 <NavLink href="/support">客服中心</NavLink> 聯繫。
              保固期內的問題會優先處理。
            </>
          ),
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {faqs.map((category) => (
        <div key={category.category} className="space-y-3">
          <h3 className="font-serif text-lg font-bold">{category.category}</h3>
          <div className="space-y-2">
            {category.questions.map((faq) => (
              <AccordionItem key={faq.q} title={faq.q}>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </AccordionItem>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-2xl border bg-primary/5 p-6">
        <h3 className="font-serif text-lg font-bold mb-2">還有其他問題？</h3>
        <p className="text-sm text-muted-foreground">
          歡迎透過 <NavLink href="/support">客服中心</NavLink> 聯繫我們，
          我們會盡快回覆您的問題。
        </p>
      </div>
    </div>
  );
}

function AccessDeniedDialog({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md mx-4 rounded-2xl border bg-card p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-4">
          <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-6 w-6 text-amber-600" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-serif text-lg font-bold">權限不足</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">
              如有需要，請透過{" "}
              <Link href="/support" className="text-primary underline hover:no-underline">
                客服中心
              </Link>{" "}
              與我們聯繫。
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
          >
            了解
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Guide() {
  const [activeTab, setActiveTab] = useState<TabId>("quickstart");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      const session = await getSession();
      setUserRole(session?.role ?? null);
    };
    loadSession();
  }, []);

  const showAccessDenied = (message: string) => {
    setAccessDeniedMessage(message);
  };

  const closeAccessDenied = () => {
    setAccessDeniedMessage(null);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "quickstart":
        return <QuickStartTab />;
      case "roles":
        return <RolesTab />;
      case "workflow":
        return <WorkflowTab />;
      case "documents":
        return <DocumentsTab />;
      case "status":
        return <StatusTab />;
      case "faq":
        return <FaqTab />;
      default:
        return null;
    }
  };

  return (
    <GuideContext.Provider value={{ userRole, showAccessDenied }}>
      {accessDeniedMessage && (
        <AccessDeniedDialog message={accessDeniedMessage} onClose={closeAccessDenied} />
      )}
      <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-8">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
            <BookOpen className="h-4 w-4" />
            使用指南
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-bold">平台功能導覽</h1>
          <p className="text-muted-foreground">
            快速了解需求、文件、報價與協作流程，確保每一步都有依據。
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>{renderTabContent()}</div>

        {/* Quick Links */}
        <QuickLinks userRole={userRole} showAccessDenied={showAccessDenied} />
      </section>
    </div>
    </GuideContext.Provider>
  );
}
