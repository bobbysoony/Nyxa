mod chapters;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! youve been greeted by me now, hahahaha", name)
}

#[tauri::command]
fn shout(name: &str) -> String {
    format!(
        "Hello, {}! you are getting shouted at!",
        name.to_uppercase()
    )
}

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "novels and chapters",
            sql: include_str!("../migrations/001_novels_and_chapters.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "reading position",
            sql: include_str!("../migrations/002_reading_position.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "read chapters",
            sql: include_str!("../migrations/003_read_chapters.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "books",
            sql: include_str!("../migrations/004_books.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "book chapters",
            sql: include_str!("../migrations/005_book_chapters.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "chapter found at",
            sql: include_str!("../migrations/006_found_at.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "download state",
            sql: include_str!("../migrations/007_download_state.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "auto download",
            sql: include_str!("../migrations/008_auto_download.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "cleared updates",
            sql: include_str!("../migrations/009_cleared.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "opened at",
            sql: include_str!("../migrations/010_opened_at.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Opening Nyxa twice crashes WebView2, so focus the open window instead.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:nyxa.db", migrations())
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            shout,
            chapters::save_chapter_text,
            chapters::load_chapter_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
