use image::{DynamicImage, ImageBuffer, ImageFormat, Rgba};
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;
use std::sync::Mutex;
use lazy_static::lazy_static;

// 使用lazy_static来保存上一次的图片hash
lazy_static! {
    static ref LAST_IMAGE_HASH: Mutex<String> = Mutex::new(String::new());
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessedImage {
    pub base64_data: String,
    pub width: u32,
    pub height: u32,
    pub original_width: u32,
    pub original_height: u32,
}

/// 处理剪切板图片：无损压缩、转base64，保持原始尺寸
/// 
/// 这个函数在独立线程中运行，不阻塞主线程
#[tauri::command]
pub async fn process_clipboard_image(
    rgba_data: Vec<u8>,
    width: u32,
    height: u32,
) -> Result<ProcessedImage, String> {
    // 在后台线程中执行CPU密集型任务
    tokio::task::spawn_blocking(move || {
        // 1. 修复Alpha通道（Tauri读取的图片Alpha通道可能为0）
        let mut fixed_rgba = rgba_data;
        for i in (3..fixed_rgba.len()).step_by(4) {
            fixed_rgba[i] = 255; // 设置为完全不透明
        }
        
        // 2. 创建图片缓冲区
        let img_buffer = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(
            width,
            height,
            fixed_rgba,
        )
        .ok_or("Failed to create image buffer")?;
        
        let img = DynamicImage::ImageRgba8(img_buffer);
        
        // 3. 转换为PNG格式（无损压缩）
        let mut png_buffer = Vec::new();
        let mut cursor = Cursor::new(&mut png_buffer);
        
        img.write_to(&mut cursor, ImageFormat::Png)
            .map_err(|e| format!("PNG encoding failed: {}", e))?;
        
        // 4. 转换为base64
        let base64_str = general_purpose::STANDARD.encode(&png_buffer);
        let data_url = format!("data:image/png;base64,{}", base64_str);
        
        Ok(ProcessedImage {
            base64_data: data_url,
            width,
            height,
            original_width: width,
            original_height: height,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 计算图片内容的简单hash，用于去重
/// 
/// 采样像素值计算hash，避免处理整个图片
#[tauri::command]
pub fn calculate_image_hash(
    rgba_data: Vec<u8>,
    width: u32,
    height: u32,
) -> Result<String, String> {
    if rgba_data.is_empty() {
        return Err("Empty RGBA data".to_string());
    }
    
    // 基础hash：尺寸信息
    let mut hash_parts = vec![width.to_string(), height.to_string()];
    
    // 采样计算：每隔一定步长取一个像素的RGB值
    let sample_size = 1000.min(rgba_data.len() / 4);
    let step = if sample_size > 0 {
        rgba_data.len() / (sample_size * 4)
    } else {
        1
    };
    
    for i in (0..rgba_data.len()).step_by(step * 4) {
        if i + 2 < rgba_data.len() {
            hash_parts.push(format!(
                "{}{}{}",
                rgba_data[i],
                rgba_data[i + 1],
                rgba_data[i + 2]
            ));
        }
    }
    
    // 简单hash算法
    let hash_str = hash_parts.join("-");
    let mut hash: i32 = 0;
    for ch in hash_str.chars().take(1000) {
        hash = ((hash << 5).wrapping_sub(hash)).wrapping_add(ch as i32);
    }
    
    Ok(hash.to_string())
}

/// 监控并处理剪切板图片（完整流程在Rust中执行）
/// 
/// 这个函数会：
/// 1. 从剪切板读取图片
/// 2. 计算hash判断是否重复
/// 3. 处理图片（无损压缩，保持原始尺寸）
/// 4. 返回处理后的图片数据（由前端保存到数据库）
#[tauri::command]
pub async fn monitor_and_process_clipboard_image(
    app: AppHandle,
) -> Result<Option<ProcessedImageWithSize>, String> {
    // 1. 从剪切板读取图片数据
    let clipboard_result = app.clipboard().read_image();
    
    let image_data = match clipboard_result {
        Ok(data) => data,
        Err(_) => {
            // 剪切板中没有图片，清空hash记录
            if let Ok(mut hash) = LAST_IMAGE_HASH.lock() {
                hash.clear();
            }
            return Ok(None);
        }
    };
    
    // 提取图片的宽度、高度和RGBA数据
    let width = image_data.width();
    let height = image_data.height();
    let rgba_bytes = image_data.rgba();
    
    if width == 0 || height == 0 || rgba_bytes.is_empty() {
        return Ok(None);
    }
    
    // 2. 计算图片hash，用于去重
    let current_hash = calculate_image_hash_internal(&rgba_bytes, width, height)?;
    
    // 检查是否与上次的图片相同
    {
        let mut last_hash = LAST_IMAGE_HASH.lock()
            .map_err(|e| format!("Failed to lock hash mutex: {}", e))?;
        
        if *last_hash == current_hash {
            // 图片没有变化，不需要处理
            return Ok(None);
        }
        
        // 更新hash记录
        *last_hash = current_hash;
    }
    
    // 3. 处理图片（缩放、压缩、转base64）
    let processed = process_image_internal(rgba_bytes.to_vec(), width, height).await?;
    
    // 4. 返回处理后的图片数据和原始大小
    Ok(Some(ProcessedImageWithSize {
        base64_data: processed.base64_data,
        width: processed.width,
        height: processed.height,
        original_size: (width * height * 4) as usize,
    }))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessedImageWithSize {
    pub base64_data: String,
    pub width: u32,
    pub height: u32,
    pub original_size: usize,
}

/// 内部函数：计算图片hash（不需要异步）
fn calculate_image_hash_internal(
    rgba_data: &[u8],
    width: u32,
    height: u32,
) -> Result<String, String> {
    if rgba_data.is_empty() {
        return Err("Empty RGBA data".to_string());
    }
    
    // 基础hash：尺寸信息
    let mut hash_parts = vec![width.to_string(), height.to_string()];
    
    // 采样计算：每隔一定步长取一个像素的RGB值
    let sample_size = 1000.min(rgba_data.len() / 4);
    let step = if sample_size > 0 {
        rgba_data.len() / (sample_size * 4)
    } else {
        1
    };
    
    for i in (0..rgba_data.len()).step_by(step * 4) {
        if i + 2 < rgba_data.len() {
            hash_parts.push(format!(
                "{}{}{}",
                rgba_data[i],
                rgba_data[i + 1],
                rgba_data[i + 2]
            ));
        }
    }
    
    // 简单hash算法
    let hash_str = hash_parts.join("-");
    let mut hash: i32 = 0;
    for ch in hash_str.chars().take(1000) {
        hash = ((hash << 5).wrapping_sub(hash)).wrapping_add(ch as i32);
    }
    
    Ok(hash.to_string())
}

/// 内部函数：处理图片（无损压缩、转base64，保持原始尺寸）
async fn process_image_internal(
    rgba_data: Vec<u8>,
    width: u32,
    height: u32,
) -> Result<ProcessedImage, String> {
    tokio::task::spawn_blocking(move || {
        // 1. 修复Alpha通道（Tauri读取的图片Alpha通道可能为0）
        let mut fixed_rgba = rgba_data;
        for i in (3..fixed_rgba.len()).step_by(4) {
            fixed_rgba[i] = 255; // 设置为完全不透明
        }
        
        // 2. 创建图片缓冲区
        let img_buffer = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(
            width,
            height,
            fixed_rgba,
        )
        .ok_or("Failed to create image buffer")?;
        
        let img = DynamicImage::ImageRgba8(img_buffer);
        
        // 3. 转换为PNG格式（无损压缩）
        let mut png_buffer = Vec::new();
        let mut cursor = Cursor::new(&mut png_buffer);
        
        img.write_to(&mut cursor, ImageFormat::Png)
            .map_err(|e| format!("PNG encoding failed: {}", e))?;
        
        // 4. 转换为base64
        let base64_str = general_purpose::STANDARD.encode(&png_buffer);
        let data_url = format!("data:image/png;base64,{}", base64_str);
        
        Ok(ProcessedImage {
            base64_data: data_url,
            width,
            height,
            original_width: width,
            original_height: height,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
