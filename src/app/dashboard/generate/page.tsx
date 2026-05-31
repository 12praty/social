"use client";

import { useState } from "react";
import { Icons } from "@/components/ui/icons";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlatformCard } from "@/components/generate/PlatformCard";
import { PlatformIcon } from "@/components/generate/PlatformIcon";
import { cn, platformLabel } from "@/lib/utils";
import type { PlatformKey } from "@/lib/prompts";

const ALL_PLATFORMS: PlatformKey[] = ["LINKEDIN", "TWITTER", "INSTAGRAM"];
const TONES = ["Professional", "Casual", "Funny", "Educational", "Inspiring"];

type Status = "idle" | "streaming" | "done" | "error";
type State = Record<PlatformKey, { content: string; status: Status }>;

const initialState: State = {
  LINKEDIN: { content: "", status: "idle" },
  TWITTER: { content: "", status: "idle" },
  INSTAGRAM: { content: "", status: "idle" },
};

export default function GeneratePage() {
  const [topic, setTopic] = useState("");
  const [platforms, setPlatforms] = useState<PlatformKey[]>(["LINKEDIN", "TWITTER", "INSTAGRAM"]);
  const [tone, setTone] = useState("Professional");
  const [generating, setGenerating] = useState(false);
  const [state, setState] = useState<State>(initialState);

  function togglePlatform(p: PlatformKey) {
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  function patch(platform: PlatformKey, partial: Partial<State[PlatformKey]>) {
    setState((s) => ({
      ...s,
      [platform]: { ...(s[platform] || { content: "", status: "idle" }), ...partial },
    }));
  }

  async function handleGenerate() {
    if (topic.trim().length < 3) return toast.error("Add a topic with at least 3 characters");
    if (platforms.length === 0) return toast.error("Pick at least one platform");
    setGenerating(true);
    setState((s) => {
      const next = { ...s };
      for (const p of platforms) next[p] = { content: "", status: "streaming" };
      return next;
    });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platforms, tone: tone.toLowerCase() }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || (await res.text().catch(() => "Generation failed")) || "Generation failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const ev of events) {
          if (!ev.trim()) continue;
          const lines = ev.split("\n");
          let evtName = "message";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) evtName = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataStr += line.slice(6);
          }
          if (!dataStr) continue;
          let payload: Record<string, unknown> = {};
          try {
            payload = JSON.parse(dataStr);
          } catch {
            continue;
          }
          const platform = payload.platform as PlatformKey | undefined;
          if (evtName === "chunk" && platform) {
            const text = String(payload.text ?? "");
            setState((s) => {
              const current = s[platform] || { content: "", status: "streaming" };
              return {
                ...s,
                [platform]: { ...current, content: current.content + text, status: "streaming" },
              };
            });
          } else if (evtName === "done" && platform) {
            const content = String(payload.content ?? "");
            setState((s) => ({ ...s, [platform]: { content, status: "done" } }));
          } else if (evtName === "error") {
            if (platform) {
              patch(platform, { status: "error" });
              toast.error(`${platformLabel(platform)}: ${String(payload.message ?? "error")}`);
            } else {
              toast.error(String(payload.message ?? "Generation failed"));
            }
          } else if (evtName === "complete") {
            // done
          }
        }
      }
      setState((current) => {
        const anyDone = platforms.some((p) => current[p]?.status === "done");
        if (anyDone) {
          toast.success("Posts ready!");
        } else {
          toast.error("Generation failed — no content produced");
        }
        return current;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setState((s) => {
        const next = { ...s };
        for (const p of platforms) {
          if (next[p] && next[p].status === "streaming") {
            next[p] = { ...next[p], status: "error" };
          }
        }
        return next;
      });
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">AI Studio</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Paste a topic, blog snippet, or rough idea. We&apos;ll write platform-perfect drafts in your brand voice.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="space-y-5 lg:col-span-2">
          <div className="space-y-2">
            <label htmlFor="generate-topic" className="text-sm font-medium text-muted-foreground">Topic / idea</label>
            <Textarea
              id="generate-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Why most B2B SaaS landing pages fail (and the 3-section template I use to fix them)…"
              className="min-h-[180px]"
            />
            <p className="text-xs text-muted-foreground">{topic.length} / 4000 chars · paste a paragraph for best results</p>
          </div>

          <div className="space-y-2">
            <label id="generate-platforms-label" className="text-sm font-medium text-muted-foreground">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((p) => {
                const active = platforms.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm transition-all duration-150 hit-area",
                      active
                        ? "border-primary/30 bg-primary/10 text-primary font-medium"
                        : "bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                    )}
                  >
                    <PlatformIcon platform={p} className="h-4 w-4" />
                    {platformLabel(p)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label id="generate-tone-label" className="text-sm font-medium text-muted-foreground">Tone</label> 
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  type="button"
                  className={cn(
                    "rounded-lg border px-3.5 py-2.5 text-sm transition-all duration-150 hit-area",
                    tone === t
                      ? "border-primary/30 bg-primary/10 text-primary font-medium"
                      : "bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={handleGenerate} disabled={generating}>
            {generating ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Wand2 className="h-4 w-4" />}
            {generating ? "Generating…" : "Generate posts"}
          </Button>
        </section>

        <section className="space-y-4 lg:col-span-3">
          {platforms.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
              Select one or more platforms to get started.
            </div>
          ) : (
            platforms.map((p) => (
              <PlatformCard
                key={p}
                platform={p}
                topic={topic}
                tone={tone}
                content={state[p]?.content ?? ""}
                status={state[p]?.status ?? "idle"}
                onContentChange={(content) => patch(p, { content })}
                onRegenerated={(content) => patch(p, { content, status: "done" })}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
