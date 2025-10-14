import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';
import { invoke } from '@tauri-apps/api/core';
import db_service from './db_service';

var intervalId = null

var old_content = ""

// 监控文本
async function monitorText() {
    try {
        const content = await readText();
        if (content && old_content != content) {
            let item = await db_service.addItem(content);
            if (item && window.addCutItemToList){
                window.addCutItemToList(item)
            }
            old_content = content;
        }
    } catch (error) {
        // 如果读取失败，可能是剪切板中没有文本
    }
}

// 🚀 监控图片（完全在Rust中处理，高性能）
// 所有图片处理逻辑（读取、hash计算、缩放、压缩）都在Rust中完成
async function monitorImage() {
    try {
        // 调用Rust命令，一次性完成图片处理（读取、去重、缩放、压缩）
        const processedData = await invoke('monitor_and_process_clipboard_image');
        
        // 如果有新图片数据，保存到数据库并通知UI
        if (processedData) {
            const item = await db_service.addImageItem({
                content: processedData.base64_data,
                width: processedData.width,
                height: processedData.height,
                size: processedData.original_size
            });
            
            if (item && window.addImageItemToList) {
                window.addImageItemToList(item);
            }
        }
    } catch (error) {
        // 静默失败，避免日志过多
        // console.error('监控图片失败:', error);
    }
}

// 🚀 监控方法（同时监控文本和图片）
// Rust处理后，图片监控不再卡顿，可以正常频率监控
async function myTimerFunction() {
    await monitorText();
    await monitorImage();
}
  
// 开始监控剪切板
function start(){
    intervalId = setInterval(myTimerFunction, 1000);
}

// 停止剪切板
function stop() {
    if (intervalId) {
        clearInterval(intervalId);
    }
    console.log("停止剪切板监控")
}

async function copyToSystem(content){
    await writeText(content)
}

async function copyImageToSystem(base64Data){
    try {
        // 创建临时 Image 元素加载图片
        const img = new Image();
        img.src = base64Data;
        
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
        
        // 创建 canvas 并绘制为 PNG 格式（剪切板最兼容的格式）
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // 将 canvas 转换为 Blob（PNG 格式）
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });
        
        // 使用 Clipboard API 写入剪切板
        const clipboardItem = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([clipboardItem]);
        
    } catch (error) {
        console.error('复制图片到剪切板失败:', error);
        throw error;
    }
}

export  { start, stop, copyToSystem, copyImageToSystem };
