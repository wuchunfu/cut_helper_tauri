use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// 文本历史记录最大条数
    #[serde(default = "default_max_text_history")]
    pub max_text_history: u32,
    
    /// 图片历史最大数量
    #[serde(default = "default_max_image_history")]
    pub max_image_history: u32,
    
    /// 开机自启动
    #[serde(default = "default_auto_start")]
    pub auto_start: bool,
}

fn default_max_text_history() -> u32 {
    500
}

fn default_max_image_history() -> u32 {
    30
}

fn default_auto_start() -> bool {
    true
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            max_text_history: default_max_text_history(),
            max_image_history: default_max_image_history(),
            auto_start: default_auto_start(),
        }
    }
}

impl AppConfig {
    /// 获取配置文件路径
    fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
        let app_data_dir = app.path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {}", e))?;
        
        // 确保目录存在
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data dir: {}", e))?;
        
        Ok(app_data_dir.join("config.json"))
    }
    
    /// 从文件加载配置
    pub fn load(app: &AppHandle) -> Result<Self, String> {
        let config_path = Self::get_config_path(app)?;
        
        if config_path.exists() {
            let content = fs::read_to_string(&config_path)
                .map_err(|e| format!("Failed to read config file: {}", e))?;
            
            let config: AppConfig = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse config: {}", e))?;
            
            Ok(config)
        } else {
            // 配置文件不存在，返回默认配置
            Ok(AppConfig::default())
        }
    }
    
    /// 保存配置到文件
    pub fn save(&self, app: &AppHandle) -> Result<(), String> {
        let config_path = Self::get_config_path(app)?;
        
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        
        fs::write(&config_path, content)
            .map_err(|e| format!("Failed to write config file: {}", e))?;
        
        Ok(())
    }
}

/// Tauri命令：获取配置
#[tauri::command]
pub fn get_config(app: AppHandle) -> Result<AppConfig, String> {
    AppConfig::load(&app)
}

/// Tauri命令：保存配置
#[tauri::command]
pub fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    config.save(&app)
}

/// Tauri命令：设置自启动
#[tauri::command]
pub async fn set_auto_start(app: AppHandle, enable: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    
    let auto_launch = app.autolaunch();
    
    if enable {
        auto_launch.enable()
            .map_err(|e| format!("启用自启动失败: {}", e))?;
    } else {
        auto_launch.disable()
            .map_err(|e| format!("禁用自启动失败: {}", e))?;
    }
    
    Ok(())
}

/// Tauri命令：检查自启动状态
#[tauri::command]
pub async fn is_auto_start_enabled(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    
    let auto_launch = app.autolaunch();
    auto_launch.is_enabled()
        .map_err(|e| format!("检查自启动状态失败: {}", e))
}

