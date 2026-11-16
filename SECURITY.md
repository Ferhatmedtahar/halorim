# Security Policy

## Supported versions

Halorim is pre-1.0. Only the latest release and the `main` branch receive security fixes.

## Reporting a vulnerability

**Do not open a public issue for security problems.**

Report privately through GitHub: **Security → Report a vulnerability** on this repository
(<https://github.com/Ferhatmedtahar/halorim/security/advisories/new>).

Please include:

- what the problem is and which component it affects (desktop app, GNOME extension, web library,
  scene parser, export)
- steps or a proof of concept to reproduce
- affected version or commit, and your OS / session type

You can expect an acknowledgement within 7 days. We will keep you updated, agree on a disclosure
date with you, and credit you in the release notes unless you prefer otherwise.

## Scope notes

Areas that deserve extra scrutiny:

- **Scene and SVG parsing**: scenes and user-uploaded SVGs are untrusted input.
- **GNOME Shell extension**: it is auto-installed by the desktop app and runs inside the Shell.
- **Desktop IPC**: Tauri commands and events exchanged between the Rust host and the webview.
- **Global pointer tracking**: the app reads the cursor position and button state desktop-wide. It
  does not read keystrokes, and it sends nothing over the network.
