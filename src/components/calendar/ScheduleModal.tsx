"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled?: () => void;
  defaultDate?: Date;
}

function defaultIsoLocal(d?: Date) {
  const date = d ?? new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ScheduleModal({ postId, open, onOpenChange, onScheduled, defaultDate: _defaultDate }: Props) {
  const defaultDate = _defaultDate ?? new Date(Date.now() + 60 * 60 * 1000);
  const [value, setValue] = useState(defaultIsoLocal(defaultDate));
  const [submitting, setSubmitting] = useState(false);

  async function handleSchedule() {
    setSubmitting(true);
    try {
      const scheduledAt = new Date(value).toISOString();
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, scheduledAt }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Schedule failed");
      toast.success("Scheduled!");
      onScheduled?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Schedule failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule a reminder</DialogTitle>
          <DialogDescription>
            Pick a date and time. At that moment, we&apos;ll email you the full post so you can publish it yourself on the
            platform.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="scheduledAt">Send content at</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            min={defaultIsoLocal(new Date(Date.now() + 60 * 1000))}
          />
          <p className="text-xs text-muted-foreground">
            Time uses your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={submitting || !value}>
            {submitting ? "Scheduling…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
