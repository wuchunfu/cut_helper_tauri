pub mod commands;
pub mod utils;

#[tauri::command]
fn greet(name: &str) -> String {
    println!("{}",name);
    format!("你好，美女 {}", name)
}



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::cut_admin::test_fun
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
