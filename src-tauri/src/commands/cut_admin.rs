use tauri::Runtime;

#[tauri::command]
pub async fn test_fun<R: Runtime>(app: tauri::AppHandle<R>, window: tauri::Window<R>) -> Result<(), String> {
    print!("哈哈{}","");   
    format!("你好啊{}","");
    Ok(())
}