/** Single source of truth for links and platform copy shown on the site. */
export const SITE = {
  name: 'Halorim',
  repo: 'https://github.com/Ferhatmedtahar/halorim',
  releases: 'https://github.com/Ferhatmedtahar/halorim/releases/latest',
} as const;

export interface PlatformEntry {
  id: 'linux' | 'windows' | 'macos';
  name: string;
  detail: string;
  /** `null` means no build is published yet. */
  href: string | null;
}

export const PLATFORMS: PlatformEntry[] = [
  { id: 'linux', name: 'Linux', detail: 'X11 and Wayland', href: SITE.releases },
  { id: 'windows', name: 'Windows', detail: 'Windows 10 and 11', href: SITE.releases },
  { id: 'macos', name: 'macOS', detail: 'In development', href: null },
];
