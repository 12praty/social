import Link from "next/link";
import { Icons } from "@/components/ui/icons";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-neutral-50 via-stone-50 to-neutral-100 p-12 lg:flex border-r">
        <Link href="/" className="flex items-center gap-3 font-semibold text-sm">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-subtle">
            <Icons.Sparkles className="h-4 w-4" />
          </span>
          Social Studio
        </Link>
        <div className="max-w-md space-y-6">
          <div className="h-px w-12 bg-foreground/10" />
          <p className="text-2xl font-medium leading-snug tracking-tight text-foreground">
            &ldquo;Two hours of content planning replaced with two minutes of typing.&rdquo;
          </p>
          <p className="text-sm text-muted-foreground">— A founder who ships consistently now</p>
        </div>
        <span className="text-xs text-muted-foreground">© Social Studio · AI Content Studio</span>
      </div>
      <div className="flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
