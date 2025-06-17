pub mod commands;
pub mod utils;
use tauri_plugin_positioner::{Position, WindowExt};
use tauri_plugin_sql::{Migration, MigrationKind};
mod tray;


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        // Define your migrations here
        Migration {
            version: 2,
            description: "create_initial_tables",
            sql: r#"
            CREATE TABLE  IF NOT EXISTS "CutItems" (
                "id" UUID NOT NULL,
                "content" TEXT NOT NULL,
                "createTime" DATETIME NOT NULL,
                PRIMARY KEY ("id")
              );

            CREATE TABLE IF NOT EXISTS "Groups" (
            "id" UUID NOT NULL,
            "name" VARCHAR(255) NOT NULL,
            "createTime" DATETIME NOT NULL,
            PRIMARY KEY ("id")
            );

            CREATE TABLE IF NOT EXISTS "GroupItems" (
            "id" UUID NOT NULL,
            "groupId" VARCHAR(255) NOT NULL,
            "content" TEXT NOT NULL,
            "title" VARCHAR(255),
            "createTime" DATETIME NOT NULL,
            "updateTime" DATETIME,
            PRIMARY KEY ("id")
            );

            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:cut.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(all(desktop))]
            {
            let handle = app.handle();
            tray::create_tray(handle)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::cut_admin::test_fun])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
