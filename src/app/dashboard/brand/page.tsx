"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Icons } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const INDUSTRIES = ["Tech / SaaS", "E-commerce", "Health & Wellness", "Finance", "Education", "Marketing", "Creative / Design", "Food", "Real estate", "Other"];
const TONE_KEYWORDS = ["Professional", "Witty", "Concise", "Inspiring", "Educational", "Bold", "Friendly", "Confident", "Playful"];

interface Brand {
  businessName: string;
  industry: string;
  targetAudience: string;
  toneKeywords: string[];
  examplePost: string | null;
  avoidWords: string[];
}

export default function BrandVoicePage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["brand"],
    queryFn: async () => {
      const r = await fetch("/api/brand");
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || "Failed to load");
      return j.brand as Brand;
    },
  });

  const [form, setForm] = useState<Brand>({
    businessName: "",
    industry: "",
    targetAudience: "",
    toneKeywords: [],
    examplePost: "",
    avoidWords: [],
  });
  const [avoidInput, setAvoidInput] = useState("");

  useEffect(() => {
    if (data) setForm({ ...data, examplePost: data.examplePost || "" });
  }, [data]);

  useEffect(() => {
    if (isError) toast.error("Failed to load brand voice");
  }, [isError]);

  const save = useMutation({
    mutationFn: async (payload: Brand) => {
      const r = await fetch("/api/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        throw new Error(body?.error || "Save failed");
      }
      return r.json();
    },
    onSuccess: () => {
      toast.success("Brand voice saved");
      qc.invalidateQueries({ queryKey: ["brand"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggleTone(t: string) {
    setForm((f) => ({
      ...f,
      toneKeywords: f.toneKeywords.includes(t) ? f.toneKeywords.filter((x) => x !== t) : [...f.toneKeywords, t],
    }));
  }

  function addAvoid() {
    const v = avoidInput.trim().toLowerCase();
    if (!v) return;
    if (!form.avoidWords.some((w) => w.toLowerCase() === v)) setForm((f) => ({ ...f, avoidWords: [...f.avoidWords, v] }));
    setAvoidInput("");
  }

  function removeAvoid(w: string) {
    setForm((f) => ({ ...f, avoidWords: f.avoidWords.filter((x) => x !== w) }));
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Brand voice</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The AI uses this on every generation. The more specific you are, the more &ldquo;you&rdquo; the output sounds.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-8 p-6">
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold tracking-tight">Brand identity</h4>
                <p className="text-xs text-tertiary mt-0.5">Who you are and what you do.</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand-name">Business / personal brand name</Label>
                  <Input
                    id="brand-name"
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    placeholder="e.g. Acme Studio"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-industry">Industry</Label>
                  <Select
                    value={form.industry}
                    onValueChange={(v) => setForm({ ...form, industry: v })}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="brand-industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => (
                        <SelectItem key={i} value={i}>
                          {i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold tracking-tight">Audience & voice</h4>
                <p className="text-xs text-tertiary mt-0.5">Who you&apos;re talking to and how you sound.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-audience">Target audience</Label>
                <Input
                  id="brand-audience"
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  placeholder="e.g. B2B SaaS founders aged 30-50 building <50 person companies"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label id="tone-label">Tone keywords</Label>
                <div className="flex flex-wrap gap-2">
                  {TONE_KEYWORDS.map((t) => {
                    const active = form.toneKeywords.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTone(t)}
                        disabled={isLoading}
                        className={`rounded-lg border px-3.5 py-2.5 text-sm transition-all duration-150 hit-area ${
                          active
                            ? "border-primary/30 bg-primary/10 text-primary font-medium"
                            : "bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold tracking-tight">Style reference</h4>
                <p className="text-xs text-tertiary mt-0.5">Examples and constraints to guide the AI.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-example">Example post (one of your best)</Label>
                <Textarea
                  id="brand-example"
                  value={form.examplePost ?? ""}
                  onChange={(e) => setForm({ ...form, examplePost: e.target.value })}
                  placeholder="Paste a post you wrote that sounds exactly like you. The AI will mimic the rhythm, vocabulary, and structure."
                  className="min-h-[140px]"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand-avoid">Words / phrases to avoid</Label>
                <div className="flex gap-2">
                  <Input
                    id="brand-avoid"
                    value={avoidInput}
                    onChange={(e) => setAvoidInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAvoid();
                      }
                    }}
                    placeholder="Type a word and press Enter"
                    disabled={isLoading}
                  />
                  <Button type="button" variant="outline" onClick={addAvoid} disabled={isLoading}>
                    Add
                  </Button>
                </div>
                {form.avoidWords.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {form.avoidWords.map((w) => (
                      <span key={w} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs text-secondary-foreground">
                        {w}
                        <button onClick={() => removeAvoid(w)} aria-label={`Remove "${w}"`} className="rounded p-0.5 hover:bg-background/50 transition-colors">
                          <Icons.X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => save.mutate(form)} disabled={save.isPending || isLoading}>
                {save.isPending && <Icons.Loader2 className="h-4 w-4 animate-spin" />}
                {save.isPending ? "Saving…" : "Save brand voice"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <h3 className="text-sm font-semibold">Live preview</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">How your brand voice will be injected into every generation:</p>
            <div className="rounded-lg border bg-secondary/50 p-4 text-xs leading-relaxed space-y-1.5">
              <p>
                <span className="font-medium text-muted-foreground">Business:</span>{" "}
                <span className="text-muted-foreground">{form.businessName || "—"}</span>
              </p>
              <p>
                <span className="font-medium text-muted-foreground">Industry:</span>{" "}
                <span className="text-muted-foreground">{form.industry || "—"}</span>
              </p>
              <p>
                <span className="font-medium text-muted-foreground">Audience:</span>{" "}
                <span className="text-muted-foreground">{form.targetAudience || "—"}</span>
              </p>
              <p className="pt-1">
                <span className="font-medium text-muted-foreground">Tone:</span>{" "}
                <span className="text-muted-foreground">{form.toneKeywords.length ? form.toneKeywords.join(", ") : "—"}</span>
              </p>
              <p>
                <span className="font-medium text-muted-foreground">Avoid:</span>{" "}
                <span className="text-muted-foreground">{form.avoidWords.length ? form.avoidWords.join(", ") : "—"}</span>
              </p>
              {form.examplePost && (
                <>
                  <p className="pt-1 font-medium text-muted-foreground">Style reference:</p>
                  <p className="line-clamp-4 italic text-muted-foreground">&ldquo;{form.examplePost}&rdquo;</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
