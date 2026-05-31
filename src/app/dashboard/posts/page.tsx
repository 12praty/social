"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Icons } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PlatformIcon } from "@/components/generate/PlatformIcon";
import { ScheduleModal } from "@/components/calendar/ScheduleModal";
import { SkeletonCard } from "@/components/ui/skeleton";
import { cn, formatDateTime, platformLabel, platformLimit } from "@/lib/utils";

type Post = {
  id: string;
  topic: string;
  platform: "LINKEDIN" | "TWITTER" | "INSTAGRAM";
  content: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED";
  tone: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
};

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "PUBLISHED", label: "Published" },
  { key: "FAILED", label: "Failed" },
];

export default function PostsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("ALL");
  const [editing, setEditing] = useState<Post | null>(null);
  const [scheduling, setScheduling] = useState<Post | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["posts", filter],
    queryFn: async () => {
      const url = filter === "ALL" ? "/api/posts" : `/api/posts?status=${filter}`;
      const r = await fetch(url);
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(body?.error || "Failed to load");
      return (body?.posts ?? []) as Post[];
    },
    refetchInterval: 30_000, // Auto-refresh every 30s to pick up status changes
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(body?.error || "Failed");
    },
    onSuccess: () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function confirmDelete(post: Post) {
    if (window.confirm(`Delete "${post.topic}"? This cannot be undone.`)) {
      del.mutate(post.id);
    }
  }

  const unschedule = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/schedule/${id}`, { method: "DELETE" });
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(body?.error || "Failed");
    },
    onSuccess: () => {
      toast.success("Unscheduled");
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Your posts</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Edit, schedule, or delete anything you&apos;ve drafted.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/generate">+ New post</Link>
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-lg border px-3.5 py-2.5 text-sm transition-all duration-150 hit-area",
              filter === f.key
                ? "border-primary/30 bg-primary/10 text-primary font-medium"
                : "bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isError && !data ? (
        <p className="text-sm text-muted-foreground">Failed to load posts.</p>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-base font-semibold">Nothing here yet</p>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Your first post is just a topic away. Head to the Studio and let AI do the heavy lifting.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/generate">Open Studio</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          {isError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Failed to refresh posts. Showing cached data.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {data.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onEdit={() => setEditing(post)}
                onSchedule={() => setScheduling(post)}
                onDelete={() => confirmDelete(post)}
                onUnschedule={() => unschedule.mutate(post.id)}
              />
            ))}
          </div>
        </div>
      )}

      {editing && <EditModal post={editing} onClose={() => setEditing(null)} />}
      {scheduling && (
        <ScheduleModal
          postId={scheduling.id}
          open={!!scheduling}
          onOpenChange={(o) => !o && setScheduling(null)}
          defaultDate={scheduling.scheduledAt ? new Date(scheduling.scheduledAt) : undefined}
          onScheduled={() => qc.invalidateQueries({ queryKey: ["posts"] })}
        />
      )}
    </div>
  );
}

const PLATFORM_BORDER: Record<string, string> = {
  LINKEDIN: "border-l-linkedin",
  TWITTER: "border-l-foreground",
  INSTAGRAM: "border-l-instagram",
};

const STATUS_BADGE: Record<string, "muted" | "warning" | "success" | "destructive"> = {
  DRAFT: "muted",
  SCHEDULED: "warning",
  PUBLISHED: "success",
  FAILED: "destructive",
};

function PostCard({
  post,
  onEdit,
  onSchedule,
  onDelete,
  onUnschedule,
}: {
  post: Post;
  onEdit: () => void;
  onSchedule: () => void;
  onDelete: () => void;
  onUnschedule: () => void;
}) {
  return (
    <div className={cn("flex flex-col rounded-xl border-l-4 border bg-card shadow-card", PLATFORM_BORDER[post.platform] || "border-l-border")}>
      <div className="flex items-center justify-between border-b px-5 py-3.5">
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <PlatformIcon platform={post.platform} className="h-4 w-4 text-muted-foreground" />
          {platformLabel(post.platform)}
        </div>
        <Badge variant={STATUS_BADGE[post.status] || "muted"} className="text-[0.625rem] uppercase tracking-wider">
          {post.status.toLowerCase()}
        </Badge>
      </div>
      <div className="flex-1 space-y-2 p-5">
        <p className="line-clamp-1 text-sm font-medium">{post.topic}</p>
        <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{post.content}</p>
      </div>
      <div className="flex items-center justify-between gap-2 border-t px-5 py-2.5">
        <p className="text-xs text-muted-foreground">
          {post.scheduledAt && post.status === "SCHEDULED"
            ? `Scheduled ${formatDateTime(post.scheduledAt)}`
            : post.publishedAt
            ? `Published ${formatDateTime(post.publishedAt)}`
            : `${post.content.length} / ${platformLimit(post.platform).toLocaleString()} chars`}
        </p>
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" onClick={onEdit} title="Edit" aria-label="Edit">
            <Icons.Edit3 className="h-4 w-4" />
          </Button>
          {post.status === "SCHEDULED" ? (
            <Button size="icon" variant="ghost" onClick={onUnschedule} title="Unschedule" aria-label="Unschedule">
              <Icons.X className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" onClick={onSchedule} title="Schedule" aria-label="Schedule">
              <Icons.CalendarPlus className="h-4 w-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onDelete} title="Delete" aria-label="Delete">
            <Icons.Trash2 className="h-4 w-4 text-destructive/70" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const qc = useQueryClient();
  const [content, setContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const limit = platformLimit(post.platform);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Tab") {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement;
    const timer = setTimeout(() => panelRef.current?.querySelector<HTMLElement>("textarea")?.focus(), 50);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      prevFocusRef.current?.focus();
    };
  }, [handleKeyDown]);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(body?.error || "Save failed");
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["posts"] });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4" role="dialog" aria-modal="true" aria-label={`Edit ${platformLabel(post.platform)} post`}>
      <div ref={panelRef} className="w-full max-w-2xl overflow-y-auto rounded-xl border bg-background p-6 shadow-modal">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Edit {platformLabel(post.platform)} post</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{post.topic}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close edit modal">
            <Icons.X className="h-4 w-4" />
          </Button>
        </div>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[260px] text-sm" />
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className={cn("tabular-nums", content.length > limit ? "text-destructive font-medium" : "text-muted-foreground")}>
            {content.length.toLocaleString()} / {limit.toLocaleString()} chars
          </span>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !content.trim()}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
