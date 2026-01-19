import { Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "核心理念", href: "#core" },
  { label: "流程設計", href: "#process" },
  { label: "AI 角色", href: "#ai" },
  { label: "合作模式", href: "#collaboration" },
  { label: "品牌介紹", href: "#brand" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/70 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <a href="#top" className="flex items-center gap-2">
          <span className="font-serif text-2xl font-bold text-primary">鋆旭 AI-Dev</span>
        </a>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a
            href="#contact"
            className="hidden md:inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
          >
            提交需求
          </a>
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
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-base font-medium text-muted-foreground hover:text-primary"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#contact"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
              onClick={() => setOpen(false)}
            >
              提交需求
            </a>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
