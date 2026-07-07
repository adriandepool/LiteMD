use serde::Serialize;

#[derive(Serialize)]
struct FileData {
    path: String,
    name: String,
    content: String,
}

#[tauri::command]
async fn open_file_dialog() -> Result<Option<FileData>, String> {
    let file = rfd::AsyncFileDialog::new()
        .add_filter("Markdown (*.md)", &["md", "markdown"])
        .pick_file()
        .await;

    if let Some(file_handle) = file {
        let path = file_handle.path().to_string_lossy().to_string();
        let name = file_handle.file_name();
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        Ok(Some(FileData { path, name, content }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn save_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn save_file_dialog(content: String) -> Result<Option<String>, String> {
    let file = rfd::AsyncFileDialog::new()
        .add_filter("Markdown (*.md)", &["md"])
        .save_file()
        .await;

    if let Some(file_handle) = file {
        let path = file_handle.path().to_string_lossy().to_string();
        std::fs::write(&path, content).map_err(|e| e.to_string())?;
        Ok(Some(path))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_cli_args() -> Option<FileData> {
    let args: Vec<String> = std::env::args().collect();
    for arg in args.iter().skip(1) {
        let path = std::path::Path::new(arg);
        if path.exists() && path.is_file() {
            if let Some(ext) = path.extension() {
                if ext == "md" || ext == "markdown" {
                    if let Ok(content) = std::fs::read_to_string(arg) {
                        let name = path.file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string();
                        return Some(FileData {
                            path: arg.clone(),
                            name,
                            content,
                        });
                    }
                }
            }
        }
    }
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            save_file,
            save_file_dialog,
            read_file,
            get_cli_args
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
