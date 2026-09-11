// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use base64::{engine::general_purpose::STANDARD, Engine as _};
use lofty::{prelude::TaggedFileExt, probe::Probe};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, get_embedded_artwork])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
