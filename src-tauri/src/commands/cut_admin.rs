use tauri::{Runtime, Manager};

#[tauri::command]
pub async fn test_fun<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
) -> Result<(), String> {
    println!("测试函数被调用");
    Ok(())
}

#[tauri::command]
pub async fn get_db_path<R: Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    // 获取应用数据目录
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    // 数据库文件路径
    let db_path = app_data_dir.join("cut.db");
    
    Ok(db_path.to_string_lossy().to_string())
}
