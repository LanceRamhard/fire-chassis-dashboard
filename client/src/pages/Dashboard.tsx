import { useState, useEffect } from "react";
import { ClipboardList, Settings, History, Flame, Sun, Moon, FileText } from "lucide-react";
import RequestForm from "@/components/RequestForm";
import SavedRequests from "@/components/SavedRequests";
import PreviouslyQuoted from "@/components/PreviouslyQuoted";
import ConfigAdmin from "@/components/ConfigAdmin";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

const TABS = [
  { id: "request", label: "New Request",       icon: ClipboardList },
  { id: "history", label: "Saved Requests",    icon: History },
  { id: "quoted",  label: "Previously Quoted", icon: FileText },
  { id: "admin",   label: "Configure Options", icon: Settings },
] as const;

type TabId = typeof TABS[number]["id"];

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("vipr-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vipr-theme", theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");
  return { theme, toggle };
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("request");
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--vipr-bg)", color: "var(--vipr-text)" }}>

      {/* ── VIPR-style header ────────────────────────────────────────────── */}
      <header className="no-print flex items-center gap-3 px-4 py-2.5 border-b"
        style={{ background: "var(--vipr-surface)", borderColor: "var(--vipr-border)" }}>

        {/* Logo mark */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: "var(--vipr-orange)" }}>
            <Flame size={15} color="#000" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight" style={{ color: "var(--vipr-text)" }}>
              Chassis Request
            </div>
            <div className="text-xs leading-tight font-medium tracking-widest uppercase"
              style={{ color: "var(--vipr-orange)", fontSize: "9px" }}>
              Midwest Fire Equipment
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1 ml-6 no-print">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                data-testid={`tab-${t.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all text-xs font-semibold tracking-wide uppercase"
                style={{
                  background:   active ? "var(--vipr-orange)" : "transparent",
                  color:        active ? "#000" : "var(--vipr-text-muted)",
                  border:       active ? "1px solid var(--vipr-orange)" : "1px solid transparent",
                  letterSpacing: "0.05em",
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = "var(--vipr-text)"; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = "var(--vipr-text-muted)"; } }}
              >
                <Icon size={12} />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Right — theme toggle + badge */}
        <div className="ml-auto flex items-center gap-2">

          {/* Dark / Light toggle */}
          <button
            onClick={toggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="no-print flex items-center justify-center w-7 h-7 rounded transition-all"
            style={{
              background: "var(--vipr-surface-2)",
              border: "1px solid var(--vipr-border)",
              color: "var(--vipr-text-muted)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--vipr-orange)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--vipr-orange)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--vipr-text-muted)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--vipr-border)"; }}
          >
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold tracking-widest uppercase"
            style={{
              background: "var(--vipr-orange-glow)",
              border: "1px solid rgba(249,115,22,0.3)",
              color: "var(--vipr-orange)",
              fontSize: "10px",
            }}>
            <Flame size={11} />
            Multi-Manufacturer Spec
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <div className="p-4">
          {activeTab === "request" && <RequestForm />}
          {activeTab === "history" && <SavedRequests onLoad={() => setActiveTab("request")} />}
          {activeTab === "quoted"  && <PreviouslyQuoted />}
          {activeTab === "admin"   && <ConfigAdmin />}
        </div>
      </main>

      <footer className="no-print py-2 text-center border-t"
        style={{ borderColor: "var(--vipr-border)", color: "var(--vipr-text-faint)", fontSize: "10px" }}>
        <PerplexityAttribution />
      </footer>
    </div>
  );
}
