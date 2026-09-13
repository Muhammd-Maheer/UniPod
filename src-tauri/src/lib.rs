// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use base64::{engine::general_purpose::STANDARD, Engine as _};
use lofty::{prelude::TaggedFileExt, probe::Probe};
use tauri_plugin_sql::{Migration, MigrationKind};
use walkdir::WalkDir;

#[tauri::command]
fn get_device_identifier(root: &str) -> Result<String, String> {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        use windows_sys::Win32::Storage::FileSystem::GetVolumeInformationW;

        let volume_root = if root.as_bytes().get(1) == Some(&b':') {
            format!("{}:\\", &root[..1])
        } else {
            root.to_string()
        };
        let root_wide: Vec<u16> = std::ffi::OsStr::new(&volume_root)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let mut serial = 0u32;
        let success = unsafe {
            GetVolumeInformationW(
                root_wide.as_ptr(),
                std::ptr::null_mut(),
                0,
                &mut serial,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                0,
            )
        };
        if success == 0 {
            return Err(std::io::Error::last_os_error().to_string());
        }
        return Ok(format!("windows-volume-{serial:08x}"));
    }

    #[cfg(not(windows))]
    Ok(format!("path-{root}"))
}

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
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_device_mount_path",
            sql: include_str!("../migrations/002_device_mount_path.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_song_sort_position",
            sql: include_str!("../migrations/003_song_sort_position.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_embedded_artwork,
            scan_disk_for_audio,
            get_device_identifier
        ])
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:unipod.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
