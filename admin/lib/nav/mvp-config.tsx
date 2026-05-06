import type { LucideIcon } from "lucide-react";
import {
  AlarmClock,
  BookOpen,
  Boxes,
  ClipboardCheck,
  Coins,
  Gauge,
  ImageIcon,
  LayoutDashboard,
  Library,
  Scale,
  ScrollText,
  Settings2,
  Shield,
  Sparkles,
  Store,
  Users,
  Volume2,
} from "lucide-react";

export type NavEntry = {
  href: string;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
  badge?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavEntry[];
};

/** §B2.4 MVP sidebar — phased rows marked disabled per NAV-AC-5 */
export const SIDEBAR_GROUPS: NavGroup[] = [
  {
    id: "operate",
    label: "Operate",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/content", label: "Content", icon: Library },
      {
        href: "/admin/store",
        label: "Store",
        icon: Store,
        disabled: true,
        badge: "V1.1",
      },
      { href: "/admin/ai/images", label: "AI Studio", icon: Sparkles },
    ],
  },
  {
    id: "review",
    label: "Review & Release",
    items: [
      { href: "/admin/reviews/qa", label: "Reviews", icon: ClipboardCheck },
      { href: "/admin/publishing/catalog", label: "Publishing", icon: ScrollText },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    items: [
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: Gauge,
        disabled: true,
        badge: "V2.0",
      },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    items: [
      { href: "/admin/users/admins", label: "Users", icon: Users },
      { href: "/admin/settings/providers", label: "Settings", icon: Settings2 },
      { href: "/admin/help", label: "Help / Docs", icon: BookOpen },
    ],
  },
];

/** Flat links for AI Studio nested routes (shown under AI header on desktop). */
export const AI_SUBLINKS: NavEntry[] = [
  { href: "/admin/ai/images", label: "Image Generation", icon: ImageIcon },
  { href: "/admin/ai/sounds", label: "Sound Generation", icon: Volume2 },
  { href: "/admin/ai/history", label: "Generation History", icon: AlarmClock },
  {
    href: "/admin/ai/uploads",
    label: "Uploads",
    icon: Boxes,
    disabled: true,
    badge: "V1.1",
  },
];

export const CONTENT_SUBLINKS: NavEntry[] = [
  { href: "/admin/content/themes", label: "Themes", icon: Sparkles },
  { href: "/admin/content/collectibles", label: "Collectibles", icon: Coins },
];

export const REVIEW_SUBLINKS: NavEntry[] = [
  { href: "/admin/reviews/qa", label: "QA Review", icon: ClipboardCheck },
  { href: "/admin/reviews/legal", label: "Legal Review", icon: Scale },
  {
    href: "/admin/reviews/ready-to-publish",
    label: "Ready to Publish",
    icon: Shield,
  },
  { href: "/admin/reviews/rejected", label: "Rejected", icon: AlarmClock },
];

export const PUBLISHING_SUBLINKS: NavEntry[] = [
  { href: "/admin/publishing/catalog", label: "Catalog", icon: ScrollText },
  { href: "/admin/publishing/versions", label: "Version History", icon: Library },
];

export const USER_SUBLINKS: NavEntry[] = [
  { href: "/admin/users/admins", label: "Admin Users", icon: Users },
  { href: "/admin/users/audit-log", label: "Audit Log", icon: ScrollText },
];

export const SETTINGS_SUBLINKS: NavEntry[] = [
  { href: "/admin/settings/providers", label: "Provider Settings", icon: Settings2 },
  {
    href: "/admin/settings/brand-rules",
    label: "Brand Rules",
    icon: BookOpen,
  },
  {
    href: "/admin/settings/compliance",
    label: "Compliance Rules",
    icon: Shield,
  },
  {
    href: "/admin/settings/environment",
    label: "Environment",
    icon: Gauge,
  },
];
