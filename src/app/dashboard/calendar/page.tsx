import { ContentCalendar } from "@/components/calendar/ContentCalendar";

export default function CalendarPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Content calendar</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Drag events to reschedule. Click a day to pick a draft. We'll email you the content at the scheduled time.
        </p>
      </header>
      <ContentCalendar />
    </div>
  );
}
