// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use base64::{engine::general_purpose::STANDARD, Engine as _};
use lofty::{prelude::TaggedFileExt, probe::Probe};
use tauri_plugin_sql::{Migration, MigrationKind};
use walkdir::WalkDir;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_embedded_artwork(path: &str) -> Result<Option<String>, String> {
    let tagged_file = Probe::open(path)
        .map_err(|error| error.to_string())?
        .read()
        .map_err(|error| error.to_string())?;

    let Some(tag) = tagged_file.primary_tag() else {
        return Ok(None);
    };

    let Some(picture) = tag.pictures().first() else {
        return Ok(None);
    };

    let mime_type = picture
        .mime_type()
        .map(ToString::to_string)
        .unwrap_or_else(|| "image/jpeg".to_string());
    Ok(Some(format!(
        "data:{};base64,{}",
        mime_type,
        STANDARD.encode(picture.data())
    )))
}

#[tauri::command]
fn scan_disk_for_audio(root: &str) -> Vec<String> {
    WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| {
            entry.file_type().is_file()
                && entry
                    .path()
                    .extension()
                    .and_then(|extension| extension.to_str())
                    .is_some_and(|extension| {
                        ["mp3", "wav", "flac", "m4a", "ogg"]
                            .iter()
                            .any(|allowed| extension.eq_ignore_ascii_case(allowed))
                    })
        })
        .map(|entry| entry.path().to_string_lossy().into_owned())
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: include_str!("../migrations/001_initial.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_embedded_artwork,
            scan_disk_for_audio
        ])
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:unipod.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
