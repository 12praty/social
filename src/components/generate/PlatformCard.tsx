"use client";

import { useEffect, useRef, useState } from "react";
import { Icons } from "@/components/ui/icons";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlatformIcon } from "./PlatformIcon";
import { cn, platformLabel, platformLimit } from "@/lib/utils";
import { ScheduleModal } from "@/components/calendar/ScheduleModal";
import type { PlatformKey } from "@/lib/prompts";

type Status = "idle" | "streaming" | "done" | "error";

interface Props {
  platform: PlatformKey;
  topic: string;
  tone: string;
  content: string;
  status: Status;
  onContentChange: (content: string) => void;
  onRegenerated: (content: string) => void;
}

const PLATFORM_ACCENT: Record<string, string> = {
  LINKEDIN: "border-l-linkedin",
  TWITTER: "border-l-foreground",
  INSTAGRAM: "border-l-instagram",
};

export function PlatformCard({ platform, topic, tone, content, status, onContentChange, onRegenerated }: Props) {
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedPostId, setSavedPostId] = useState<string | null>(null);
  const [imagePrompts, setImagePrompts] = useState<string[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [doneAnimate, setDoneAnimate] = useState(false);
  const scrollRef = useRef<HTMLTextAreaElement>(null);

  const limit = platformLimit(platform);
  const len = content.length;
  const overLimit = len > limit;
  const nearLimit = !overLimit && len > limit * 0.92;

  useEffect(() => {
    if (status === "streaming" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (status === "done") {
      setDoneAnimate(true);
      const t = setTimeout(() => setDoneAnimate(false), 400);
      return () => clearTimeout(t);
    }
  }, [content, status]);

  async function handleRegenerate() {
    if (!content.trim()) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/generate/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform, tone }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Regenerate failed");
      onRegenerated(body.content);
      toast.success(`${platformLabel(platform)} regenerated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const id = await ensureSavedPostId();
      if (id) toast.success("Saved as draft");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  }

  async function fetchImagePrompts() {
    if (!content.trim() || loadingPrompts) return;
    setLoadingPrompts(true);
    try {
      const res = await fetch("/api/generate/image-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, content, platform }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Failed");
      setImagePrompts(body?.prompts || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoadingPrompts(false);
    }
  }



  async function ensureSavedPostId(): Promise<string | null> {
    try {
      if (savedPostId) {
        const res = await fetch(`/api/posts/${savedPostId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, topic, tone, imagePrompts }),
        });
        if (!res.ok) throw new Error("Save failed");
        return savedPostId;
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform, tone, content, imagePrompts }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Save failed");
      setSavedPostId(body.post.id);
      return body.post.id;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      return null;
    }
  }

  async function handleSchedule() {
    if (!content.trim()) return;
    const id = await ensureSavedPostId();
    if (id) setScheduleOpen(true);
  }

  return (
    <div className={cn("rounded-xl border-l-4 border bg-card shadow-card", PLATFORM_ACCENT[platform] || "border-l-border")}>
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <PlatformIcon platform={platform} className="h-4 w-4 text-muted-foreground" />
          {platformLabel(platform)}
          {status === "streaming" && (
            <span className="ml-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icons.Loader2 className="h-3 w-3 animate-spin" />
              writing
            </span>
          )}
          {status === "done" && (
            <span className={cn("ml-1 inline-flex items-center gap-1.5 text-xs text-emerald-600", doneAnimate && "animate-done-pop")}>
              <Icons.Check className="h-3 w-3" />
              done
            </span>
          )}
        </div>
        <div className={cn("text-xs tabular-nums", overLimit ? "text-destructive font-medium" : nearLimit ? "text-amber-600" : "text-muted-foreground")}>
          {len.toLocaleString()} / {limit.toLocaleString()}
        </div>
      </div>

      <div className="p-5">
        <Textarea
          ref={scrollRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder={status === "streaming" ? "" : "Waiting for content…"}
          readOnly={status === "streaming"}
          className="min-h-[160px] max-h-[420px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed placeholder:text-muted-foreground/60 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent focus:ring-0 focus:border-transparent scrollbar-thin"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleCopy} disabled={!content || status === "streaming"}>
            <Icons.Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
          <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={regenerating || status === "streaming" || !content}>
            {regenerating ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.RotateCcw className="h-3.5 w-3.5" />}
            Regenerate
          </Button>
          <Button size="sm" variant="outline" onClick={fetchImagePrompts} disabled={loadingPrompts || !content || status === "streaming"}>
            {loadingPrompts ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.Image className="h-3.5 w-3.5" />}
            Image ideas
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleSave} disabled={saving || !content || status === "streaming"}>
            {saving ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.Save className="h-3.5 w-3.5" />}
            {savedPostId ? "Saved" : "Save draft"}
          </Button>
          <Button size="sm" onClick={handleSchedule} disabled={!content || status === "streaming"}>
            <Icons.CalendarPlus className="h-3.5 w-3.5" />
            Schedule
          </Button>
        </div>
      </div>

      {imagePrompts.length > 0 && (
        <div className="border-t bg-secondary/30 px-5 py-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Image ideas (click to copy)</p>
          <div className="grid gap-2 md:grid-cols-3">
            {imagePrompts.map((p, i) => {
              return (
                <button
                  key={i}
                  onClick={() => {
                    navigator.clipboard.writeText(p);
                    toast.success("Prompt copied to clipboard!");
                  }}
                  className="rounded-lg border bg-card p-3 text-left text-xs leading-relaxed text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:shadow-subtle transition-all duration-150 relative overflow-hidden"
                  title="Click to copy prompt"
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {scheduleOpen && savedPostId && (
        <ScheduleModal
          postId={savedPostId}
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          onScheduled={() => toast.success("Scheduled!")}
        />
      )}
    </div>
  );
}
