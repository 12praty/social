"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduleModal } from "./ScheduleModal";
import { formatDateTime, platformColor, platformLabel } from "@/lib/utils";
import { PlatformIcon } from "@/components/generate/PlatformIcon";
import { Icons } from "@/components/ui/icons";

type Post = {
  id: string;
  topic: string;
  platform: "LINKEDIN" | "TWITTER" | "INSTAGRAM";
  content: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED";
  scheduledAt: string | null;
  publishedAt: string | null;
};

export function ContentCalendar() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Post | null>(null);
  const [reschedulePost, setReschedulePost] = useState<Post | null>(null);
  const [pickDraftFor, setPickDraftFor] = useState<Date | null>(null);

  const scheduledQ = useQuery({
    queryKey: ["calendar", "scheduled"],
    queryFn: async () => {
      const r = await fetch("/api/posts");
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || "Failed");
      return (j?.posts as Post[] ?? []).filter((p) => p.scheduledAt || p.publishedAt);
    },
    refetchInterval: 30_000,
  });

  const events = (scheduledQ.data ?? []).map((p) => {
    const start = p.scheduledAt || p.publishedAt!;
    return {
      id: p.id,
      title: `${platformLabel(p.platform)} · ${p.topic.slice(0, 30)}${p.topic.length > 30 ? "…" : ""}`,
      start,
      backgroundColor: platformColor(p.platform),
      borderColor: platformColor(p.platform),
      textColor: "#ffffff",
      extendedProps: { post: p },
    };
  });

  async function reschedule(postId: string, scheduledAt: string) {
    const r = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, scheduledAt }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => null);
      toast.error(err?.error || "Reschedule failed");
      return false;
    }
    toast.success("Rescheduled");
    qc.invalidateQueries({ queryKey: ["calendar", "scheduled"] });
    qc.invalidateQueries({ queryKey: ["posts"] });
    return true;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {(["LINKEDIN", "TWITTER", "INSTAGRAM"] as const).map((p) => (
            <span key={p} className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: platformColor(p) }} />
              {platformLabel(p)}
            </span>
          ))}
        </div>
        <Button onClick={() => setPickDraftFor(new Date())} size="sm">+ Schedule a draft</Button>
      </div>

      {scheduledQ.isError ? (
        <p className="text-sm text-muted-foreground">Failed to load schedule.</p>
      ) : scheduledQ.isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={`h-${i}`} className="h-4 w-full" />
              ))}
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={`d-${i}`} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-3 sm:p-5">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek",
              }}
              events={events}
              height="auto"
              editable
              eventClick={(info) => setSelected(info.event.extendedProps.post as Post)}
              dateClick={(info) => setPickDraftFor(info.date)}
              eventDrop={async (info) => {
                try {
                  const start = info.event.start;
                  if (!start) { toast.error("Event has no date"); info.revert(); return; }
                  const ok = await reschedule(info.event.id, start.toISOString());
                  if (!ok) info.revert();
                } catch {
                  toast.error("Reschedule failed");
                  info.revert();
                }
              }}
            />
          </CardContent>
        </Card>
      )}

      {selected && <PostDetailDrawer post={selected} onClose={() => setSelected(null)} onReschedule={() => setReschedulePost(selected)} />}

      {reschedulePost && (
        <ScheduleModal
          postId={reschedulePost.id}
          open={!!reschedulePost}
          onOpenChange={(o) => !o && setReschedulePost(null)}
          defaultDate={reschedulePost.scheduledAt ? new Date(reschedulePost.scheduledAt) : undefined}
          onScheduled={() => {
            qc.invalidateQueries({ queryKey: ["calendar"] });
            setReschedulePost(null);
            setSelected(null);
          }}
        />
      )}

      {pickDraftFor && <PickDraftModal date={pickDraftFor} onClose={() => setPickDraftFor(null)} />}
    </div>
  );
}

function PostDetailDrawer({ post, onClose, onReschedule }: { post: Post; onClose: () => void; onReschedule: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  async function unschedule() {
    if (!window.confirm(`Unschedule "${post.topic}"? The post will return to drafts.`)) return;
    try {
      const r = await fetch(`/api/schedule/${post.id}`, { method: "DELETE" });
      if (!r.ok) {
        const err = await r.json().catch(() => null);
        toast.error(err?.error || "Failed to unschedule");
        return;
      }
      toast.success("Unscheduled");
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
      onClose();
    } catch {
      toast.error("Network error — could not unschedule");
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => panelRef.current?.querySelector<HTMLElement>("button")?.focus(), 50);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const isPast = post.scheduledAt ? new Date(post.scheduledAt) < new Date() : false;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={`${platformLabel(post.platform)} post details`}>
      <div className="flex-1 bg-black/20" onClick={onClose} role="presentation" />
      <div ref={panelRef} className="flex h-full w-full max-w-md flex-col border-l bg-background shadow-elevated">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <PlatformIcon platform={post.platform} className="h-4 w-4 text-muted-foreground" />
            {platformLabel(post.platform)}
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close post details">
            <Icons.X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex items-center gap-3">
            <Badge variant={post.status === "PUBLISHED" ? "success" : post.status === "SCHEDULED" ? "warning" : post.status === "FAILED" ? "destructive" : "muted"}>
              {post.status.toLowerCase()}
            </Badge>
            {post.scheduledAt && <span className="text-xs text-muted-foreground">{formatDateTime(post.scheduledAt)}</span>}
          </div>
          <p className="text-sm font-medium">{post.topic}</p>
          <div className="whitespace-pre-wrap rounded-lg border bg-secondary/30 p-4 font-sans text-sm leading-relaxed">{post.content}</div>
        </div>
        <div className="flex gap-3 border-t px-5 py-4">
          {post.status === "SCHEDULED" && !isPast && (
            <>
              <Button variant="outline" className="flex-1" onClick={onReschedule}>
                Reschedule
              </Button>
              <Button variant="destructive" className="flex-1" onClick={unschedule}>
                Unschedule
              </Button>
            </>
          )}
          {post.status === "PUBLISHED" && (
            <Button variant="outline" className="flex-1" onClick={() => navigator.clipboard.writeText(post.content).then(() => toast.success("Copied"))}>
              Copy content
            </Button>
          )}
          {post.status === "FAILED" && (
            <Button variant="outline" className="flex-1" onClick={onReschedule}>
              Reschedule
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PickDraftModal({ date, onClose }: { date: Date; onClose: () => void }) {
  const qc = useQueryClient();
  const [chosenId, setChosenId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drafts = useQuery({
    queryKey: ["drafts"],
    queryFn: async () => {
      const r = await fetch("/api/posts?status=DRAFT");
      if (!r.ok) throw new Error("Failed");
      return (await r.json().catch(() => null))?.posts as Post[] ?? [];
    },
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => panelRef.current?.querySelector<HTMLElement>("button")?.focus(), 50);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  if (drafts.isLoading) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Pick a draft to schedule">
        <div ref={panelRef} className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-modal" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">Pick a draft to schedule</h2>
            <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close draft picker">
              <Icons.X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Loading drafts…</p>
        </div>
      </div>
    );
  }

  return chosenId ? (
    <ScheduleModal
      postId={chosenId}
      open={true}
      onOpenChange={(o) => {
        if (!o) {
          setChosenId(null);
          onClose();
        }
      }}
      defaultDate={date}
      onScheduled={() => {
        toast.success("Scheduled!");
        qc.invalidateQueries({ queryKey: ["calendar"] });
        qc.invalidateQueries({ queryKey: ["posts"] });
      }}
    />
  ) : (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Pick a draft to schedule">
      <div ref={panelRef} className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Pick a draft to schedule</h2>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close draft picker">
            <Icons.X className="h-4 w-4" />
          </Button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">Selected date: {formatDateTime(date)}</p>
        {drafts.isError ? (
          <p className="text-sm text-muted-foreground">Failed to load drafts.</p>
        ) : !drafts.data || drafts.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drafts yet. Generate one first.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {drafts.data.map((p) => (
              <li key={p.id}>
                <button onClick={() => setChosenId(p.id)} className="flex w-full items-center gap-3 rounded-lg border p-3.5 text-left hover:bg-secondary/50 transition-colors duration-150">
                  <PlatformIcon platform={p.platform} className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.topic}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{p.content}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
