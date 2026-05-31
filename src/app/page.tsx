import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-sm tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-subtle">
            <Icons.Sparkles className="h-4 w-4" />
          </span>
          Social Studio
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href="/register">Get started free</Link>
          </Button>
        </nav>
      </header>

      <section className="container grid gap-16 py-20 lg:grid-cols-2 lg:items-center">
        <div className="space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full border bg-white px-3.5 py-1 text-xs text-muted-foreground shadow-subtle">
            <Icons.Sparkles className="h-3.5 w-3.5 text-primary" />
            On-brand content for every platform
          </span>
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl leading-[1.1]">
            Paste an idea.{" "}
            <span className="text-primary">
              Ship a week of content.
            </span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
            Generate platform-perfect LinkedIn, Twitter, and Instagram posts in seconds. Streaming AI, your brand voice
            baked in, scheduling, and a calendar your future self will thank you for.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                Start creating <Icons.ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">I have an account</Link>
            </Button>
          </div>
          <div className="flex items-center gap-6 pt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Icons.Linkedin className="h-4 w-4 text-linkedin" /> LinkedIn
            </span>
            <span className="flex items-center gap-2">
              <Icons.Twitter className="h-4 w-4" /> Twitter / X
            </span>
            <span className="flex items-center gap-2">
              <Icons.Instagram className="h-4 w-4 text-instagram" /> Instagram
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 -z-10 bg-gradient-to-tr from-primary/5 via-primary/3 to-transparent blur-3xl" />
          <div className="grid gap-4">
            {[
              { p: "LinkedIn", color: "border-l-linkedin", body: "Most teams ship features. Great teams ship feedback loops..." },
              { p: "Twitter / X", color: "border-l-foreground", body: "1/ The best moat in 2026 isn't tech. It's distribution." },
              { p: "Instagram", color: "border-l-instagram", body: "Mornings used to feel like a fire drill ☕️ Then we changed one thing..." },
            ].map((card, i) => (
              <div
                key={i}
                className={`relative rounded-xl border bg-white p-5 shadow-card ${card.color}`}
                style={{ transform: `translateX(${i * 12}px)` }}
              >
                <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-tertiary">
                  <span>{card.p}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 text-[10px] font-medium">draft</span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container grid gap-6 pb-24 md:grid-cols-3">
        {[
          { icon: <Icons.Wand2 className="h-5 w-5" />, title: "Streaming AI", body: "Watch every post fill in token by token. Ship in seconds, not minutes." },
          { icon: <Icons.Calendar className="h-5 w-5" />, title: "Calendar + scheduler", body: "Drop posts on a calendar. We'll email you the content when it's time to post." },
          { icon: <Icons.BarChart3 className="h-5 w-5" />, title: "Brand voice + analytics", body: "Train it on your best posts. Track output, streaks, and platform mix." },
        ].map((f, i) => (
          <div key={i} className="rounded-xl border bg-white p-6 shadow-card">
            <div className="mb-4 inline-grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">{f.icon}</div>
            <h3 className="text-base font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t bg-white py-8">
        <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Social Studio · Portfolio demo</span>
          <span>Built with Next.js, Gemini, Prisma, and Resend</span>
        </div>
      </footer>
    </div>
  );
}
