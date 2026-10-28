use std::io::{Read, Write};

use flate2::read::ZlibDecoder;
use flate2::write::ZlibEncoder;
use flate2::Compression;
use rusqlite::{params, Connection, OptionalExtension};
use tauri::Manager;

/// Squash text into fewer bytes.
fn compress(text: &str) -> Vec<u8> {
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(text.as_bytes()).expect("writing to memory can't fail");
    encoder.finish().expect("writing to memory can't fail")
}

/// Turn squashed bytes back into the text they came from.
fn decompress(bytes: &[u8]) -> Result<String, String> {
    let mut text = String::new();
    ZlibDecoder::new(bytes)
        .read_to_string(&mut text)
        .map_err(|e| e.to_string())?;
    Ok(text)
}

/// Open chapters.db in Nyxa's app data folder, making the table the first time.
fn open_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let folder = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
    let db = Connection::open(folder.join("chapters.db")).map_err(|e| e.to_string())?;
    db.execute(
        "CREATE TABLE IF NOT EXISTS chapter_text (
            chapter_id INTEGER PRIMARY KEY,
            body BLOB NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(db)
}

#[tauri::command]
pub async fn save_chapter_text(
    app: tauri::AppHandle,
    chapter_id: i64,
    html: String,
) -> Result<usize, String> {
    let body = compress(&html);
    let db = open_db(&app)?;
    db.execute(
        "INSERT OR REPLACE INTO chapter_text (chapter_id, body) VALUES (?1, ?2)",
        params![chapter_id, body],
    )
    .map_err(|e| e.to_string())?;
    Ok(body.len())
}

#[tauri::command]
pub async fn load_chapter_text(
    app: tauri::AppHandle,
    chapter_id: i64,
) -> Result<Option<String>, String> {
    let db = open_db(&app)?;
    let body: Option<Vec<u8>> = db
        .query_row(
            "SELECT body FROM chapter_text WHERE chapter_id = ?1",
            params![chapter_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    match body {
        Some(bytes) => Ok(Some(decompress(&bytes)?)),
        None => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn text_survives_a_round_trip() {
        let text = "<p>The lamp by the window was the only light left.</p>".repeat(200);
        let squashed = compress(&text);
        assert!(squashed.len() < text.len() / 5);
        assert_eq!(decompress(&squashed).unwrap(), text);
    }

    #[test]
    fn damaged_bytes_give_an_error(){
        assert!(decompress(b"hello").is_err());
    }
}
