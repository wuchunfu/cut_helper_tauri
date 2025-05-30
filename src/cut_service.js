import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';
import db_service from './db_service';

var intervalId = null

var old_content = ""
// 监控方法
async function myTimerFunction() {
    const content = await readText();
    console.log(content);
    if (old_content != content) {
        let item = await db_service.addItem(content);
        if (window.addCutItemToList){
            window.addCutItemToList(item)
        }
    }
    old_content = content;
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

export { start,stop };
