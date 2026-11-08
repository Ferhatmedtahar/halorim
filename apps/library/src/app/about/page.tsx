import Link from 'next/link';

export const metadata = {
  title: 'Setup Guide & About - Glowframe',
  description:
    'How to install and run Glowframe prismatic wallpapers on Windows, Linux, and web browsers.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-white mb-3">Installation & Platform Guide</h1>
        <p className="text-slate-400 text-sm">
          Glowframe is an open-source, interactive desktop wallpaper engine inspired by real-time
          prismatic rim dispersion.
        </p>
      </div>

      <div className="space-y-10 text-slate-300 text-sm leading-relaxed">
        {/* Windows Setup */}
        <section className="bg-[#12141c] border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            Windows Setup
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-slate-300">
            <p>
              Glowframe wallpapers can be hosted on Windows using either the popular open-source{' '}
              <a
                href="https://rocksdanister.github.io/lively/"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 underline hover:text-cyan-300"
              >
                Lively Wallpaper
              </a>{' '}
              host or the native Glowframe desktop runner (Milestone 8).
            </p>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Using with Lively Wallpaper:</h3>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-400">
                <li>
                  Download the <strong>Standalone HTML Pack (.zip)</strong> from any wallpaper page.
                </li>
                <li>Extract the zip folder to your desired location.</li>
                <li>
                  Open Lively Wallpaper and click <strong>Add Wallpaper (+)</strong>.
                </li>
                <li>
                  Browse to the extracted folder and select{' '}
                  <code className="text-cyan-300">index.html</code>.
                </li>
                <li>Click OK to apply the interactive wallpaper to your desktop!</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Linux Setup */}
        <section className="bg-[#12141c] border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            Linux Setup
          </h2>
          <div className="space-y-4 text-xs sm:text-sm text-slate-300">
            <p>
              On Linux, wallpapers run in a lightweight WebGL2 webview surface placed directly on
              the desktop layer.
            </p>

            <div className="space-y-2">
              <h3 className="font-semibold text-white">X11 Compositors:</h3>
              <p className="text-xs text-slate-400">
                Glowframe runs via an X11 window with the{' '}
                <code className="text-indigo-300">_NET_WM_WINDOW_TYPE_DESKTOP</code> atom hint,
                placing it behind desktop icons and active windows.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-white">Wayland (wlroots & KDE Plasma):</h3>
              <p className="text-xs text-slate-400">
                On Wayland compositors that support the{' '}
                <code className="text-indigo-300">wlr-layer-shell-unstable-v1</code> protocol
                (Hyprland, Sway, KDE Plasma 6), Glowframe binds to the{' '}
                <code className="text-indigo-300">ZWLR_LAYER_SHELL_V1_LAYER_BACKGROUND</code> layer.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
              <strong>Notice on GNOME Wayland:</strong> GNOME Shell does not support the
              wlr-layer-shell protocol. On GNOME under Wayland, use an XWayland desktop fallback or
              standalone browser window mode.
            </div>
          </div>
        </section>

        {/* Offline & Architecture */}
        <section className="bg-[#12141c] border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            Engine Architecture & Licensing
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-slate-400">
            <p>
              Glowframe wallpapers are built upon a deterministic $O(N)$ Euclidean Distance
              Transform pipeline rendered completely in WebGL2 with zero runtime garbage collection.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Engine code is licensed under the <strong>MIT License</strong>.
              </li>
              <li>
                The <strong>Tux penguin</strong> character was created by Larry Ewing with GIMP and
                is included under open attribution.
              </li>
              <li>All presets adhere to the Glowframe v1 Zod schema specification.</li>
            </ul>
          </div>
        </section>
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-all"
        >
          &larr; Return to Wallpaper Gallery
        </Link>
      </div>
    </div>
  );
}
