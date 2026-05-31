import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  SparklesIcon,
  MagicWand01Icon,
  Calendar01Icon,
  BarChartIcon,
  Logout01Icon,
  Menu01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  RefreshIcon,
  FloppyDiskIcon,
  CalendarPlus,
  Spinner,
  CheckmarkCircle01Icon,
  Image01Icon,
  Edit01Icon,
  LinkedinIcon,
  NewTwitterIcon,
  InstagramIcon,
  Palette,
  Trash,
  Flame,
  FileText,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
function icon(Icon: IconSvgElement) {
  const Component = (props: Record<string, unknown>) => (
    <HugeiconsIcon icon={Icon} strokeWidth={1.5} {...props} />
  );
  Component.displayName = "HugeIcon";
  return Component;
}

export const Icons = {
  Sparkles: icon(SparklesIcon),
  Wand2: icon(MagicWand01Icon),
  Calendar: icon(Calendar01Icon),
  FileText: icon(FileText),
  Palette: icon(Palette),
  BarChart3: icon(BarChartIcon),
  LogOut: icon(Logout01Icon),
  Menu: icon(Menu01Icon),
  X: icon(Cancel01Icon),
  ArrowRight: icon(ArrowRight01Icon),
  Copy: icon(Copy01Icon),
  RotateCcw: icon(RefreshIcon),
  Save: icon(FloppyDiskIcon),
  CalendarPlus: icon(CalendarPlus),
  Loader2: icon(Spinner),
  Check: icon(CheckmarkCircle01Icon),
  Image: icon(Image01Icon),
  Trash2: icon(Trash),
  Edit3: icon(Edit01Icon),
  Flame: icon(Flame),
  Linkedin: icon(LinkedinIcon),
  Twitter: icon(NewTwitterIcon),
  Instagram: icon(InstagramIcon),
  Eye: icon(ViewIcon),
  EyeOff: icon(ViewOffSlashIcon),
};
