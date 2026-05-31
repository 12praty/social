import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, platformLabel } from "@/lib/utils";

export default async function DashboardHome() {
  let session;
  try {
    session = await getSession();
  } catch {
    return null;
  }
  if (!session) return null;

  const data: Record<string, unknown> = {};
  try {
    const [u, t, r, up] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } }),
      prisma.post.groupBy({
        by: ["status"],
        where: { userId: session.userId },
        _count: { _all: true },
      }),
      prisma.post.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.post.findMany({
        where: {
          userId: session.userId,
          status: "SCHEDULED",
          scheduledAt: { gt: new Date() },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),
    ]);
    data.user = u;
    data.totals = t;
    data.recent = r;
    data.upcoming = up;
  } catch (err: unknown) {
    console.error("[dashboard] failed to load data", err instanceof Error ? err.message : String(err));
  }
  const user = data.user as { name: string; email: string } | null;
  const totals = (data.totals || []) as Array<{ status: string; _count: { _all: number } }>;
  const recent = (data.recent || []) as Array<{ id: string; topic: string; platform: "LINKEDIN" | "TWITTER" | "INSTAGRAM"; status: string; createdAt: Date }>;
  const upcoming = (data.upcoming || []) as Array<{ id: string; topic: string; platform: "LINKEDIN" | "TWITTER" | "INSTAGRAM"; scheduledAt: Date | null }>;

  const counts = Object.fromEntries(totals.map((t) => [t.status, t._count._all]));
  const total = totals.reduce((sum, t) => sum + t._count._all, 0);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">
          Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Your AI content workspace at a glance.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total posts", value: total },
          { label: "Drafts", value: counts.DRAFT || 0 },
          { label: "Scheduled", value: counts.SCHEDULED || 0 },
          { label: "Published", value: counts.PUBLISHED || 0 },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-tertiary">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction href="/dashboard/generate" icon={<Icons.Wand2 className="h-5 w-5" />} title="Generate" subtitle="Stream new posts" />
        <QuickAction href="/dashboard/calendar" icon={<Icons.Calendar className="h-5 w-5" />} title="Calendar" subtitle="See your plan" />
        <QuickAction href="/dashboard/posts" icon={<Icons.FileText className="h-5 w-5" />} title="Posts" subtitle="Edit & manage" />
        <QuickAction href="/dashboard/brand" icon={<Icons.Palette className="h-5 w-5" />} title="Brand voice" subtitle="Tune your style" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent activity</h2>
              <Link href="/dashboard/posts" className="text-xs text-tertiary hover:text-foreground transition-colors">
                View all
              </Link>
            </div>
            {recent.length === 0 ? (
              <EmptyState
                title="No posts yet"
                body="Head over to Generate to create your first batch in seconds."
                cta={{ href: "/dashboard/generate", label: "Generate now" }}
              />
            ) : (
              <ul className="space-y-2">
                {recent.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.topic}</p>
                      <p className="mt-0.5 text-xs text-tertiary">
                        {platformLabel(p.platform)} · {p.status.toLowerCase()} · {formatDateTime(p.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Upcoming</h2>
              <Link href="/dashboard/calendar" className="text-xs text-tertiary hover:text-foreground transition-colors">
                Open calendar
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState
                title="Nothing scheduled"
                body="Schedule a draft and we'll email you the content when it's time to post."
                cta={{ href: "/dashboard/posts", label: "View drafts" }}
              />
            ) : (
              <ul className="space-y-2">
                {upcoming.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.topic}</p>
                      <p className="mt-0.5 text-xs text-tertiary">
                        {platformLabel(p.platform)} · {p.scheduledAt ? formatDateTime(p.scheduledAt) : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-xl border bg-card p-5 shadow-card transition-all duration-150 hover:shadow-elevated hover:border-foreground/10"
    >
      <div className="flex items-center gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-tertiary mt-0.5">{subtitle}</p>
        </div>
      </div>
      <Icons.ArrowRight className="h-4 w-4 text-tertiary transition-all duration-150 group-hover:translate-x-0.5" />
    </Link>
  );
}

function EmptyState({ title, body, cta }: { title: string; body: string; cta: { href: string; label: string } }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
      <Button asChild size="sm" className="mt-4">
        <Link href={cta.href}>{cta.label}</Link>
      </Button>
    </div>
  );
}
