import { Icons } from "@/components/ui/icons";

export function PlatformIcon({ platform, className }: { platform: "LINKEDIN" | "TWITTER" | "INSTAGRAM"; className?: string }) {
  if (platform === "LINKEDIN") return <Icons.Linkedin className={className} />;
  if (platform === "TWITTER") return <Icons.Twitter className={className} />;
  return <Icons.Instagram className={className} />;
}
