import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { api, LIBRARY_CHANGED_EVENT } from "@/lib/api";
import type { Health } from "@/lib/types";
import { BrandMark, Icon, type IconName } from "./icons";
import { cn } from "./ui";

const navigation: Array<{ to: string; label: string; icon: IconName; end?: boolean }> = [
  { to: "/", label: "问答", icon: "chat", end: true },
  { to: "/search", label: "证据检索", icon: "search" },
  { to: "/library", label: "知识库", icon: "database" },
];

const SIDEBAR_STORAGE_KEY = "cc-rag-sidebar-collapsed";

function sidebarStartsCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function Brand({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span
        title="意识昏迷知识库"
        className="flex size-9 shrink-0 items-center justify-center rounded-deco bg-n-950 text-white"
      >
        <BrandMark className="h-5 w-5" />
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-deco bg-n-950 text-white">
        <BrandMark className="h-5 w-5" />
      </span>
      <p className="min-w-0 truncate text-body font-semibold tracking-cn">意识昏迷知识库</p>
    </div>
  );
}

function StatusLight({
  online,
  checking,
  label,
}: {
  online: boolean;
  checking: boolean;
  label: string;
}) {
  const color = checking ? "bg-n-450" : online ? "bg-success" : "bg-danger";
  return (
    <span
      title={label}
      aria-hidden="true"
      className="relative inline-flex size-3 shrink-0 items-center justify-center"
    >
      <span className={cn("status-breathe absolute inset-0 rounded-full", color)} />
      <span className={cn("relative size-2 rounded-full", color)} />
    </span>
  );
}

function useHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async (silent = false) => {
    if (!silent) setChecking(true);
    try {
      setHealth(await api.health());
    } catch {
      setHealth(null);
    } finally {
      if (!silent) setChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();
    const timer = window.setInterval(() => void check(true), 30000);
    return () => window.clearInterval(timer);
  }, [check]);

  return { health, checking, check };
}

export function Layout() {
  const { health, checking, check } = useHealth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(sidebarStartsCollapsed);
  const serviceState = checking
    ? "检测服务中"
    : health
      ? "服务在线"
      : "服务未连接";

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, [collapsed]);

  useLayoutEffect(() => {
    const main = document.getElementById("main");
    if (main) main.scrollTop = 0;
  }, [pathname]);

  useEffect(() => {
    const handleChange = () => void check(true);
    window.addEventListener(LIBRARY_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(LIBRARY_CHANGED_EVENT, handleChange);
  }, [check]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-canvas">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-n-950 px-4 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        跳到主内容
      </a>

      <p className="sr-only" role="status" aria-live="polite">
        {checking
          ? "正在检测服务"
          : health
            ? `服务在线，${health.stats.sources} 篇来源，${health.stats.chunks} 个证据片段`
            : "服务未连接"}
      </p>

      <aside
        id="app-sidebar"
        aria-label="侧边栏"
        className={cn(
          "hidden h-full shrink-0 flex-col overflow-hidden bg-canvas transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[84px]" : "w-[272px]",
        )}
      >
        <div
          className={cn(
            "flex h-[84px] shrink-0 items-center",
            collapsed ? "justify-center" : "pr-4 pl-6",
          )}
        >
          <Brand compact={collapsed} />
        </div>

        <nav
          aria-label="主导航"
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto",
            collapsed ? "px-3" : "px-5",
          )}
        >
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "relative flex h-9 w-full items-center overflow-hidden rounded-full text-body tracking-cn transition-[background-color,font-weight] duration-150",
                  collapsed ? "justify-center" : "pr-3 pl-10",
                  isActive
                    ? "bg-line-100 font-medium text-n-950"
                    : "font-normal text-n-700 hover:bg-n-150 hover:font-medium hover:text-n-950",
                )
              }
            >
              {collapsed ? (
                <Icon name={item.icon} />
              ) : (
                <span className="absolute top-0 left-2 flex h-9 w-5 items-center justify-center">
                  <Icon name={item.icon} />
                </span>
              )}
              <span className={collapsed ? "sr-only" : "min-w-0 truncate"}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <footer
          className={cn(
            "flex shrink-0 pb-5",
            collapsed ? "flex-col items-center gap-2" : "items-center justify-between px-5",
          )}
        >
          <StatusLight online={!!health} checking={checking} label={serviceState} />
          <button
            type="button"
            aria-controls="app-sidebar"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
            title={collapsed ? "展开侧边栏" : "收起侧边栏"}
            onClick={() => setCollapsed((current) => !current)}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line-300 bg-surface text-n-550 transition-[color,background-color,border-color] duration-150 hover:border-[#c9cfdb] hover:bg-n-150 hover:text-n-950"
          >
            <Icon
              name={collapsed ? "chevronRight" : "chevronLeft"}
              className="h-[18px] w-[18px]"
            />
          </button>
        </footer>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-line-100 bg-canvas lg:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <Brand />
            <span className="flex size-6 shrink-0 items-center justify-center">
              <StatusLight online={!!health} checking={checking} label={serviceState} />
            </span>
          </div>
          <nav aria-label="主导航" className="flex gap-1 px-3 pb-2">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex h-9 items-center gap-1.5 rounded-full px-3 text-sm tracking-cn transition-colors duration-150",
                    isActive
                      ? "bg-line-100 font-medium text-n-950"
                      : "text-n-700 hover:bg-n-150",
                  )
                }
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto outline-none">
          <div className="mx-auto flex min-h-[calc(100dvh-112px)] w-full max-w-[1600px] flex-1 flex-col gap-3 px-4 pt-4 pb-8 sm:px-6 lg:min-h-[100dvh] lg:pt-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
