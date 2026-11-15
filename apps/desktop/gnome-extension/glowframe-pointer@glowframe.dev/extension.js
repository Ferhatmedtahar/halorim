// Glowframe Desktop Bridge
//
// GNOME on Wayland gives ordinary applications no way to be the desktop background and no way to
// read the mouse position. Glowframe therefore keeps drawing into its own (XWayland) windows, and
// this extension does the two things only the Shell can do:
//
// 1. Live background. Every background the Shell draws (desktop, Activities overview, app grid,
//    workspace switching) gets a live copy of the Glowframe window of that monitor layered on top
//    of the static picture. The real window is made invisible and click-through, so it can never
//    cover the desktop icons and nothing changes when the Shell swaps between its views: the
//    wallpaper is the same moving picture everywhere.
//
// 2. Pointer. While a Glowframe window exists the pointer position is published on D-Bus:
//
//      org.gnome.Shell  /dev/glowframe/Pointer  dev.glowframe.Pointer
//        GetVersion() -> (u)
//        Pointer(i index, d x, d y, u buttons, b onDesktop)   signal
//            index     number in the window title "Glowframe Wallpaper <index>", -1 = on no wallpaper
//            x, y      position inside that monitor, 0..1
//            buttons   Clutter modifier mask (button 1 = 1 << 8)
//            onDesktop true when nothing but the desktop is under the pointer
//        GetState() -> (i x, i y, u buttons, b onDesktop)     kept for older Glowframe builds
//
//    The position is read with global.get_pointer(): pointer events that go to application windows
//    never reach the Shell's stage, so listening for events there misses most movement.
//
// Nothing here runs while Glowframe is not running: no timer, no extra actors.

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import * as Background from 'resource:///org/gnome/shell/ui/background.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension, InjectionManager } from 'resource:///org/gnome/shell/extensions/extension.js';

const BRIDGE_VERSION = 2;
const TITLE_PREFIX = 'Glowframe Wallpaper';
const WM_CLASSES = ['glowframe-desktop', 'Glowframe-desktop', 'Glowframe'];
const POLL_MS = 16;
const BUTTON_MASK =
  Clutter.ModifierType.BUTTON1_MASK |
  Clutter.ModifierType.BUTTON2_MASK |
  Clutter.ModifierType.BUTTON3_MASK;

const IFACE = `
<node>
  <interface name="dev.glowframe.Pointer">
    <method name="GetVersion">
      <arg type="u" direction="out" name="version"/>
    </method>
    <method name="GetState">
      <arg type="i" direction="out" name="x"/>
      <arg type="i" direction="out" name="y"/>
      <arg type="u" direction="out" name="buttons"/>
      <arg type="b" direction="out" name="onDesktop"/>
    </method>
    <signal name="Pointer">
      <arg type="i" name="index"/>
      <arg type="d" name="x"/>
      <arg type="d" name="y"/>
      <arg type="u" name="buttons"/>
      <arg type="b" name="onDesktop"/>
    </signal>
  </interface>
</node>`;

function isWallpaperWindow(win) {
  if (!win) return false;
  const title = win.get_title() ?? '';
  if (!title.startsWith(TITLE_PREFIX)) return false;
  const cls = win.get_wm_class() ?? '';
  const instance = win.get_wm_class_instance?.() ?? '';
  return WM_CLASSES.includes(cls) || WM_CLASSES.includes(instance);
}

/** The number at the end of "Glowframe Wallpaper <n>" (the window Glowframe made for monitor n). */
function wallpaperIndex(win) {
  const match = (win.get_title() ?? '').match(/(\d+)\s*$/);
  return match ? parseInt(match[1], 10) : 0;
}

function isDesktopLike(win) {
  if (isWallpaperWindow(win)) return true;
  if (win.get_window_type() === Meta.WindowType.DESKTOP) return true;
  const title = win.get_title() ?? '';
  if (title.includes('@!') || title.startsWith('Desktop Icons')) return true; // Desktop Icons NG
  const ids = [win.get_gtk_application_id?.(), win.get_wm_class?.(), win.get_sandboxed_app_id?.()];
  return ids.some((id) => typeof id === 'string' && /(^|\.)ding($|\.|-)|rastersoft/i.test(id));
}

/** True when a click at (x, y) lands on the desktop: no application window, panel, dock or menu. */
function pointerOnDesktop(x, y) {
  if (Main.overview.visible || Main.modalCount > 0) return false;
  try {
    let actor = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x, y);
    while (actor) {
      if (actor instanceof Meta.WindowActor) return isDesktopLike(actor.get_meta_window());
      if (actor === global.window_group || actor === global.stage) return true;
      if (actor === Main.layoutManager.uiGroup) return false; // panel, dock, popups
      actor = actor.get_parent();
    }
    return true;
  } catch {
    // Fall back to the window list (ignores panels, good enough).
    const workspace = global.workspace_manager.get_active_workspace();
    const actors = global.get_window_actors();
    for (let i = actors.length - 1; i >= 0; i--) {
      const win = actors[i].get_meta_window();
      if (!win || win.minimized || !win.showing_on_its_workspace()) continue;
      if (!win.is_on_all_workspaces() && !win.located_on_workspace(workspace)) continue;
      const r = win.get_frame_rect();
      if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height) return isDesktopLike(win);
    }
    return true;
  }
}

/**
 * Child of a Shell background actor that shows a live copy of one Glowframe window, stretched so the
 * window's visible area exactly covers the background (whatever size the Shell draws it at).
 */
const LiveLayer = GObject.registerClass(
  { GTypeName: 'GlowframeLiveLayer' },
  class LiveLayer extends Clutter.Actor {
    _init(monitorIndex) {
      super._init({ x_expand: true, y_expand: true, reactive: false });
      this.monitorIndex = monitorIndex;
      this._clone = null;
      this._window = null;
    }

    setWindow(win) {
      if (this._window === win) return;
      this._clone?.destroy();
      this._clone = null;
      this._window = win;
      const source = win?.get_compositor_private();
      if (!source) {
        this._window = null;
        return;
      }
      this._clone = new Clutter.Clone({ source, reactive: false });
      this.add_child(this._clone);
      this.queue_relayout();
    }

    vfunc_get_preferred_width(_forHeight) {
      return [0, 0];
    }

    vfunc_get_preferred_height(_forWidth) {
      return [0, 0];
    }

    vfunc_allocate(box) {
      this.set_allocation(box);
      if (!this._clone || !this._window) return;
      const frame = this._window.get_frame_rect();
      const buffer = this._window.get_buffer_rect();
      if (frame.width <= 0 || frame.height <= 0) return;
      const sx = box.get_width() / frame.width;
      const sy = box.get_height() / frame.height;
      const child = new Clutter.ActorBox();
      child.set_origin((buffer.x - frame.x) * sx, (buffer.y - frame.y) * sy);
      child.set_size(buffer.width * sx, buffer.height * sy);
      this._clone.allocate(child);
    }
  },
);

export default class GlowframeBridgeExtension extends Extension {
  enable() {
    this._windows = new Map(); // Meta.Window -> { actor, ids: [[object, id], ...] }
    this._layers = new Set();
    this._pollId = 0;
    this._last = null;
    this._onDesktop = false;

    this._dbus = Gio.DBusExportedObject.wrapJSObject(IFACE, this);
    this._dbus.export(Gio.DBus.session, '/dev/glowframe/Pointer');

    // Every background actor the Shell creates from now on gets a live layer.
    this._injections = new InjectionManager();
    const bridge = this;
    this._injections.overrideMethod(
      Background.BackgroundManager.prototype,
      '_createBackgroundActor',
      (original) =>
        function () {
          const backgroundActor = original.call(this);
          try {
            bridge._attachLayer(backgroundActor);
          } catch (e) {
            logError(e, 'Glowframe: could not attach live layer');
          }
          return backgroundActor;
        },
    );
    // ...and so do the desktop backgrounds that already exist.
    for (const manager of Main.layoutManager._bgManagers ?? []) {
      try {
        if (manager.backgroundActor) this._attachLayer(manager.backgroundActor);
      } catch (e) {
        logError(e, 'Glowframe: could not attach live layer');
      }
    }

    this._mapId = global.window_manager.connect('map', (_wm, actor) => {
      this._considerWindow(actor.get_meta_window());
    });
    for (const actor of global.get_window_actors()) this._considerWindow(actor.get_meta_window());
  }

  disable() {
    if (this._mapId) global.window_manager.disconnect(this._mapId);
    this._mapId = 0;

    this._injections?.clear();
    this._injections = null;

    for (const win of [...this._windows.keys()]) this._releaseWindow(win, true);
    this._windows.clear();
    for (const layer of [...this._layers]) layer.destroy();
    this._layers.clear();

    this._stopPolling();
    this._dbus?.unexport();
    this._dbus = null;
  }

  // --- wallpaper windows ---------------------------------------------------------------------

  _considerWindow(win) {
    if (!win || this._windows.has(win) || !isWallpaperWindow(win)) return;
    const actor = win.get_compositor_private();
    if (!actor) return; // not shown yet: the 'map' signal brings us back

    const ids = [];
    const watch = (object, signal, handler) => ids.push([object, object.connect(signal, handler)]);

    // Invisible on screen (the live layers show it instead), but still painted through the copies.
    actor.opacity = 0;
    watch(actor, 'notify::opacity', () => {
      if (actor.opacity !== 0) actor.opacity = 0;
    });
    watch(actor, 'destroy', () => this._releaseWindow(win, false));
    watch(win, 'unmanaged', () => this._releaseWindow(win, false));
    watch(win, 'position-changed', () => this._syncLayers());
    watch(win, 'size-changed', () => this._syncLayers());
    watch(win, 'notify::minimized', () => {
      if (win.minimized) win.unminimize();
    });
    watch(win, 'raised', () => win.lower());

    this._windows.set(win, { actor, ids });
    if (!win.is_on_all_workspaces()) win.stick();
    win.lower();

    this._syncLayers();
    this._startPolling();
  }

  _releaseWindow(win, restore) {
    const entry = this._windows.get(win);
    if (!entry) return;
    this._windows.delete(win);
    for (const [object, id] of entry.ids) {
      try {
        object.disconnect(id);
      } catch {
        // object already gone
      }
    }
    if (restore) {
      try {
        entry.actor.opacity = 255;
      } catch {
        // actor already gone
      }
    }
    this._syncLayers();
    if (this._windows.size === 0) this._stopPolling();
  }

  _windowForMonitor(monitorIndex) {
    for (const win of this._windows.keys()) {
      if (win.get_monitor() === monitorIndex) return win;
    }
    return null;
  }

  // --- live layers ---------------------------------------------------------------------------

  _attachLayer(backgroundActor) {
    const layer = new LiveLayer(backgroundActor.monitor);
    backgroundActor.layout_manager = new Clutter.BinLayout();
    backgroundActor.add_child(layer);
    this._layers.add(layer);
    layer.connect('destroy', () => this._layers.delete(layer));
    layer.setWindow(this._windowForMonitor(layer.monitorIndex));
  }

  _syncLayers() {
    for (const layer of this._layers) layer.setWindow(this._windowForMonitor(layer.monitorIndex));
  }

  // --- pointer -------------------------------------------------------------------------------

  _startPolling() {
    if (this._pollId) return;
    this._last = null;
    this._pollId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, POLL_MS, () => {
      this._poll();
      return GLib.SOURCE_CONTINUE;
    });
  }

  _stopPolling() {
    if (this._pollId) GLib.source_remove(this._pollId);
    this._pollId = 0;
  }

  _poll() {
    const [x, y, mods] = global.get_pointer();
    const buttons = mods & BUTTON_MASK;
    const last = this._last;
    if (last && last.x === x && last.y === y && last.buttons === buttons) return;

    // Whether the pointer is on the desktop only matters for clicks: test it when a button changes.
    if (!last || last.buttons !== buttons) this._onDesktop = pointerOnDesktop(x, y);
    this._last = { x, y, buttons };

    let index = -1;
    let nx = 0;
    let ny = 0;
    const monitorIndex = global.display.get_current_monitor();
    const win = this._windowForMonitor(monitorIndex);
    const monitor = Main.layoutManager.monitors[monitorIndex];
    if (win && monitor && monitor.width > 0 && monitor.height > 0) {
      index = wallpaperIndex(win);
      nx = Math.min(1, Math.max(0, (x - monitor.x) / monitor.width));
      ny = Math.min(1, Math.max(0, (y - monitor.y) / monitor.height));
    }
    this._dbus?.emit_signal(
      'Pointer',
      GLib.Variant.new('(iddub)', [index, nx, ny, buttons, this._onDesktop]),
    );
  }

  // --- D-Bus methods -------------------------------------------------------------------------

  GetVersion() {
    return BRIDGE_VERSION;
  }

  GetState() {
    const [x, y, mods] = global.get_pointer();
    return [x, y, mods, pointerOnDesktop(x, y)];
  }
}
