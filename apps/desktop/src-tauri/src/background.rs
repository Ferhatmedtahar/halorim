//! GNOME desktop background management.
//!
//! The live wallpaper window is fully opaque, so GNOME's own background is only visible when the
//! window is not (Super/Activities overview, while loading, or after Glowframe quits). We:
//!   1. remember the user's original wallpaper settings before touching anything,
//!   2. publish a snapshot of the current Glowframe scene as the GNOME background so the overview
//!      shows the glowing logo instead of a black screen,
//!   3. restore the original wallpaper on exit.

use std::path::PathBuf;
use std::process::Command;

const SCHEMA: &str = "org.gnome.desktop.background";
const KEYS: [&str; 5] = [
    "picture-uri",
    "picture-uri-dark",
    "picture-options",
    "primary-color",
    "secondary-color",
];

fn is_gnome() -> bool {
    std::env::var("XDG_CURRENT_DESKTOP")
        .map(|d| d.to_uppercase().contains("GNOME"))
        .unwrap_or(false)
}

fn config_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".config").join("glowframe")
}

fn saved_path() -> PathBuf {
    config_dir().join("original-background.txt")
}

fn gsettings_get(key: &str) -> Option<String> {
    let out = Command::new("gsettings").args(["get", SCHEMA, key]).output().ok()?;
    if !out.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

fn gsettings_set(key: &str, value: &str) {
    let _ = Command::new("gsettings").args(["set", SCHEMA, key, value]).output();
}

fn gsettings_reset(key: &str) {
    let _ = Command::new("gsettings").args(["reset", SCHEMA, key]).output();
}

/// True when the value points at one of our generated images.
pub fn is_glowframe_uri(value: &str) -> bool {
    value.contains("/glowframe/")
}

/// Serializes `key=value` lines (value is the raw GVariant text printed by gsettings).
pub fn encode_settings(pairs: &[(String, String)]) -> String {
    pairs.iter().map(|(k, v)| format!("{}={}\n", k, v)).collect()
}

pub fn decode_settings(text: &str) -> Vec<(String, String)> {
    text.lines()
        .filter_map(|l| l.split_once('='))
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect()
}

/// After a crash or a shutdown that killed Glowframe, our still snapshot can still be the GNOME
/// background. Put the user's own wallpaper back before anything else.
pub fn recover_leftover_snapshot() {
    if !is_gnome() {
        return;
    }
    if gsettings_get("picture-uri").map(|v| is_glowframe_uri(&v)).unwrap_or(false) {
        restore_original();
    }
}

/// Remembers the user's wallpaper once. Never overwrites an existing backup and never records one
/// of our own generated images (e.g. after a crash) as the "original".
pub fn save_original() {
    if !is_gnome() || saved_path().exists() {
        return;
    }
    let mut pairs = Vec::new();
    for key in KEYS {
        if let Some(v) = gsettings_get(key) {
            pairs.push((key.to_string(), v));
        }
    }
    let current_uri = pairs
        .iter()
        .find(|(k, _)| k == "picture-uri")
        .map(|(_, v)| v.as_str())
        .unwrap_or("");
    if is_glowframe_uri(current_uri) {
        return; // Already ours: nothing trustworthy to save. restore_original() resets to default.
    }
    let _ = std::fs::create_dir_all(config_dir());
    let _ = std::fs::write(saved_path(), encode_settings(&pairs));
}

/// Puts the user's original wallpaper back (or the system default if none was recorded).
pub fn restore_original() {
    if !is_gnome() {
        return;
    }
    match std::fs::read_to_string(saved_path()) {
        Ok(text) => {
            for (k, v) in decode_settings(&text) {
                if KEYS.contains(&k.as_str()) {
                    gsettings_set(&k, &v);
                }
            }
            let _ = std::fs::remove_file(saved_path());
        }
        Err(_) => {
            for key in KEYS {
                if gsettings_get(key).map(|v| is_glowframe_uri(&v)).unwrap_or(false) {
                    gsettings_reset(key);
                }
            }
        }
    }
}

/// Publishes a PNG snapshot of the current scene as the GNOME background (visible in the overview).
pub fn publish_snapshot(png: &[u8]) -> std::io::Result<()> {
    if !is_gnome() {
        return Ok(());
    }
    save_original();
    let dir = config_dir();
    std::fs::create_dir_all(&dir)?;

    // A new file name each time makes GNOME reload the image.
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let path = dir.join(format!("snapshot-{}.png", stamp));
    std::fs::write(&path, png)?;

    let uri = format!("'file://{}'", path.display());
    gsettings_set("picture-uri", &uri);
    gsettings_set("picture-uri-dark", &uri);
    gsettings_set("picture-options", "'zoom'");
    gsettings_set("primary-color", "'#000000'");
    gsettings_set("secondary-color", "'#000000'");

    if let Ok(entries) = std::fs::read_dir(&dir) {
        for e in entries.flatten() {
            let p = e.path();
            let is_old_snapshot = p
                .file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.starts_with("snapshot-") && n.ends_with(".png"))
                .unwrap_or(false);
            if is_old_snapshot && p != path {
                let _ = std::fs::remove_file(p);
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn settings_round_trip() {
        let pairs = vec![
            ("picture-uri".to_string(), "'file:///a/b.png'".to_string()),
            ("picture-options".to_string(), "'zoom'".to_string()),
        ];
        assert_eq!(decode_settings(&encode_settings(&pairs)), pairs);
    }

    #[test]
    fn detects_generated_images() {
        assert!(is_glowframe_uri("'file:///home/u/.config/glowframe/snapshot-1.png'"));
        assert!(!is_glowframe_uri("'file:///usr/share/backgrounds/x.png'"));
    }
}
