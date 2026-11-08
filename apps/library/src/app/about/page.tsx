import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Terminal, ShieldCheck, Monitor, Cpu, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Glowframe // System Setup Guide',
  description:
    'How to install and run Glowframe prismatic wallpapers on Windows, Linux, and web browsers.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-mono">
      <div className="border border-terminal-border bg-terminal-card p-6 mb-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Terminal className="w-5 h-5 text-terminal-cyan" />
          <h1 className="text-base font-bold text-slate-100 tracking-wider">
            GLOWFRAME // PLATFORM_SETUP_MANUAL
          </h1>
          <Badge variant="cyan" bracketed>v0.8.0</Badge>
        </div>
        <p className="text-xs text-terminal-dim leading-relaxed">
          Operational deployment procedures for Linux (Wayland/X11), Windows 10/11, and standalone
          sandboxed browser environments.
        </p>
      </div>

      <div className="space-y-6">
        {/* Windows Setup */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs text-slate-100 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-terminal-cyan" />
                Windows Setup
              </CardTitle>
              <Badge variant="cyan" bracketed>WIN32 / UWP</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2 text-xs text-terminal-dim space-y-3">
            <p>
              Glowframe wallpapers can be hosted on Windows using either the popular open-source{' '}
              <a
                href="https://rocksdanister.github.io/lively/"
                target="_blank"
                rel="noreferrer"
                className="text-terminal-cyan underline hover:text-white"
              >
                Lively Wallpaper
              </a>{' '}
              host or the native Glowframe desktop runner.
            </p>
            <div className="border border-terminal-border bg-terminal-bg p-3 space-y-2">
              <div className="font-semibold text-slate-200 text-xs">
                &gt;_ Execution with Lively Wallpaper:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                <li>
                  Download the <strong>Standalone HTML Pack (.zip)</strong> from any preset or custom studio.
                </li>
                <li>Extract the zip folder to your desired filesystem directory.</li>
                <li>
                  Open Lively Wallpaper and select <strong>Add Wallpaper (+)</strong>.
                </li>
                <li>
                  Select <code className="text-terminal-cyan">index.html</code> from the extracted package.
                </li>
                <li>Save to engage the interactive real-time wallpaper!</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Linux Setup */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs text-slate-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-terminal-green" />
                Linux Setup
              </CardTitle>
              <Badge variant="green" bracketed>X11 / WAYLAND</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2 text-xs text-terminal-dim space-y-3">
            <p>
              On Linux, wallpapers run in a lightweight hardware-accelerated WebGL2 surface placed
              directly on the desktop window stack with selective cursor event routing.
            </p>

            <div className="border border-terminal-border bg-terminal-bg p-3 space-y-2">
              <div className="font-semibold text-slate-200 text-xs">&gt;_ X11 Compositors:</div>
              <p className="text-[11px] text-slate-300">
                Glowframe runs via an X11 window with the{' '}
                <code className="text-terminal-green">_NET_WM_WINDOW_TYPE_DESKTOP</code> atom hint,
                placing it behind desktop icons and active windows.
              </p>
            </div>

            <div className="border border-terminal-border bg-terminal-bg p-3 space-y-2">
              <div className="font-semibold text-slate-200 text-xs">
                &gt;_ Wayland (wlroots &amp; KDE Plasma):
              </div>
              <p className="text-[11px] text-slate-300">
                On Wayland compositors that support the{' '}
                <code className="text-terminal-green">layer-shell</code> protocol
                (Hyprland, Sway, KDE Plasma 6), Glowframe binds to the background layer.
              </p>
            </div>

            <div className="p-3 border border-terminal-amber/40 bg-terminal-amber/10 text-terminal-amber text-[11px]">
              <strong>[NOTICE: GNOME Wayland]:</strong> GNOME Shell does not support third-party layer-shell surfaces.
              On GNOME under Wayland, Glowframe launches with seamless Xwayland backward compatibility
              and central input passthrough, ensuring desktop icons and files remain 100% interactive.
            </div>
          </CardContent>
        </Card>

        {/* Architecture & Verification */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-xs text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-terminal-cyan" />
              Engine Architecture &amp; Licensing
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 text-xs text-terminal-dim space-y-2">
            <p>
              Glowframe wallpapers are built upon a deterministic $O(N)$ Euclidean Distance
              Transform pipeline rendered completely in WebGL2 with zero runtime garbage collection.
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
              <li>Engine code is licensed under the <strong>MIT License</strong>.</li>
              <li>Iconic Linux presets (Tux, Arch, Debian) are included under open community licenses.</li>
              <li>All presets adhere to the Glowframe v1 Zod schema specification.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <Link href="/">
          <Button variant="terminal" size="sm" className="inline-flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN_TO_VAULT</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
