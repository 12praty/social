"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { useState } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Icons.Sparkles },
  { href: "/dashboard/generate", label: "Generate", icon: Icons.Wand2 },
  { href: "/dashboard/calendar", label: "Calendar", icon: Icons.Calendar },
  { href: "/dashboard/posts", label: "Posts", icon: Icons.FileText },
  { href: "/dashboard/brand", label: "Brand voice", icon: Icons.Palette },
];

export function Sidebar({ user }: { user: { email: string; name: string | null } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // best-effort — clear cookie client-side too
      document.cookie = "ss_session=; path=/; max-age=0";
    }
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  const initials =
    (user.name || user.email)
      .split(/\s+|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  return (
    <>
      <button
        onClick={() => setMobileOpen((v) => !v)}
        className="fixed left-3 top-3 z-50 grid h-10 w-10 place-items-center rounded-lg border bg-card shadow-card lg:hidden"
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <Icons.X className="h-5 w-5" /> : <Icons.Menu className="h-5 w-5" />}
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-background transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 border-b px-6 py-5"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-subtle">
            <Icons.Sparkles className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Social Studio</span>
        </Link>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 hit-area",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-sm font-medium text-secondary-foreground">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name || "You"}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150 hit-area"
              aria-label="Sign out"
              title="Sign out"
            >
              <Icons.LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)} role="presentation" />
      )}
    </>
  );
}
