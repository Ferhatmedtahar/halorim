//! Start Glowframe automatically when the user logs in (XDG autostart, used by GNOME, KDE, XFCE...).
//!
//! On by default: the first launch creates ~/.config/autostart/glowframe.desktop. Turning it off in
//! the tray removes that file and remembers the choice, so it is not created again.

use std::path::{Path, PathBuf};

const DESKTOP_FILE: &str = "glowframe.desktop";
const OPT_OUT_FILE: &str = "autostart-disabled";

fn config_home() -> PathBuf {
    match std::env::var("XDG_CONFIG_HOME") {
        Ok(dir) if !dir.is_empty() => PathBuf::from(dir),
        _ => PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| ".".to_string())).join(".config"),
    }
}

fn entry_path() -> PathBuf {
    config_home().join("autostart").join(DESKTOP_FILE)
}

fn opt_out_path() -> PathBuf {
    config_home().join("glowframe").join(OPT_OUT_FILE)
}

/// Quotes a path for the Exec key of a .desktop file.
pub fn exec_quote(path: &Path) -> String {
    let s = path.to_string_lossy();
    if s.chars().all(|c| c.is_ascii_alphanumeric() || "/._-+".contains(c)) {
        return s.into_owned();
    }
    let escaped = s
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('`', "\\`")
        .replace('$', "\\$");
    format!("\"{}\"", escaped)
}

pub fn desktop_entry(exe: &Path) -> String {
    format!(
        "[Desktop Entry]\n\
         Type=Application\n\
         Name=Glowframe\n\
         Comment=Live interactive wallpaper\n\
         Exec={}\n\
         Terminal=false\n\
         NoDisplay=true\n\
         X-GNOME-Autostart-enabled=true\n\
         X-GNOME-Autostart-Delay=2\n",
        exec_quote(exe)
    )
}

pub fn is_enabled() -> bool {
    entry_path().exists()
}

/// Called on every launch: (re)writes the entry unless the user turned autostart off. Rewriting keeps
/// the Exec path correct when the binary moved.
pub fn ensure_default() {
    if opt_out_path().exists() {
        return;
    }
    let _ = write_entry();
}

fn write_entry() -> std::io::Result<()> {
    let exe = std::env::current_exe()?;
    let path = entry_path();
    let content = desktop_entry(&exe);
    if std::fs::read_to_string(&path).ok().as_deref() == Some(content.as_str()) {
        return Ok(());
    }
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    std::fs::write(path, content)
}

pub fn set_enabled(enabled: bool) {
    if enabled {
        let _ = std::fs::remove_file(opt_out_path());
        let _ = write_entry();
    } else {
        let _ = std::fs::remove_file(entry_path());
        if let Some(dir) = opt_out_path().parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        let _ = std::fs::write(opt_out_path(), "");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_paths_are_not_quoted() {
        assert_eq!(exec_quote(Path::new("/usr/bin/glowframe-desktop")), "/usr/bin/glowframe-desktop");
    }

    #[test]
    fn paths_with_spaces_and_specials_are_quoted() {
        assert_eq!(exec_quote(Path::new("/home/a b/glow")), "\"/home/a b/glow\"");
        assert_eq!(exec_quote(Path::new("/x/$y")), "\"/x/\\$y\"");
    }

    #[test]
    fn entry_points_at_binary() {
        let e = desktop_entry(Path::new("/opt/glowframe/glowframe-desktop"));
        assert!(e.starts_with("[Desktop Entry]\n"));
        assert!(e.contains("\nExec=/opt/glowframe/glowframe-desktop\n"));
        assert!(e.contains("X-GNOME-Autostart-enabled=true"));
    }
}
