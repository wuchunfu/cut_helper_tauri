import Database from '@tauri-apps/plugin-sql';
import { v4 as uuidv4 } from 'uuid';
import { invoke } from '@tauri-apps/api/core';

var db = null;

// 默认配置
let config = {
  max_text_history: 500,
  max_image_history: 30
};

// 配置加载状态
let configLoaded = false;

// 加载配置
async function loadConfig() {
  try {
    config = await invoke('get_config');
    configLoaded = true;
    console.log('配置已加载:', config);
  } catch (error) {
    console.error('加载配置失败，使用默认配置:', error);
    configLoaded = true;
  }
}

// 监听配置更新事件
if (window.__TAURI__) {
  import('@tauri-apps/api/event').then(({ listen }) => {
    listen('config-updated', (event) => {
      config = event.payload;
      console.log('配置已更新:', config);
    });
  });
}

export default {

  async init() {
    if (!db) {
      db = await Database.load('sqlite:cut.db');
    }
    // 确保配置已加载
    if (!configLoaded) {
      await loadConfig();
    }
  },

  async addItem(content) {
    await this.init();
    const id = uuidv4(); // 生成 UUID
    const createTime = new Date().toISOString(); // 当前时间戳
    
    try {
      await db.execute(
        'INSERT INTO CutItems (id, content, createTime) VALUES (?, ?, ?)',
        [id, content, createTime]
      );
      
      // 检查记录总数，如果超过上限，删除最旧的记录
      const countResult = await db.select('SELECT COUNT(*) as count FROM CutItems');
      const totalCount = countResult[0].count;
      
      if (totalCount > config.max_text_history) {
        const deleteCount = totalCount - config.max_text_history;
        await db.execute(
          `DELETE FROM CutItems WHERE id IN (
            SELECT id FROM CutItems ORDER BY createTime ASC LIMIT ?
          )`,
          [deleteCount]
        );
      }
      
      return {"id":id,"content":content,"createTime":createTime}
    } catch (error) {
      console.error('Error adding item:', error);
      return null;
    }
  },

  async fetchItems() {
    await this.init();
    try {
      const result = await db.select('SELECT * FROM CutItems order by createTime desc');
      return result || [];
    } catch (error) {
      console.error('Error fetching items:', error);
      return [];
    }
  },

  async removeItem(id) {
    await this.init();
    try {
      await db.execute('DELETE FROM CutItems WHERE id =?',[id]);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  },

  // 图片相关方法
  async addImageItem(imageData) {
    await this.init();
    const id = uuidv4();
    const createTime = new Date().toISOString();
    
    try {
      await db.execute(
        'INSERT INTO ImageItems (id, content, width, height, size, createTime) VALUES (?, ?, ?, ?, ?, ?)',
        [id, imageData.content, imageData.width, imageData.height, imageData.size, createTime]
      );
      
      // 检查记录总数，如果超过上限，删除最旧的记录
      const countResult = await db.select('SELECT COUNT(*) as count FROM ImageItems');
      const totalCount = countResult[0].count;
      
      if (totalCount > config.max_image_history) {
        const deleteCount = totalCount - config.max_image_history;
        await db.execute(
          `DELETE FROM ImageItems WHERE id IN (
            SELECT id FROM ImageItems ORDER BY createTime ASC LIMIT ?
          )`,
          [deleteCount]
        );
      }
      
      return {
        id,
        content: imageData.content,
        width: imageData.width,
        height: imageData.height,
        size: imageData.size,
        createTime
      };
    } catch (error) {
      console.error('Error adding image item:', error);
      return null;
    }
  },

  async fetchImageItems() {
    await this.init();
    try {
      const result = await db.select('SELECT * FROM ImageItems ORDER BY createTime DESC');
      return result || [];
    } catch (error) {
      console.error('Error fetching image items:', error);
      return [];
    }
  },

  async removeImageItem(id) {
    await this.init();
    try {
      await db.execute('DELETE FROM ImageItems WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error removing image item:', error);
    }
  },

  // 获取当前配置
  getCurrentConfig() {
    return { ...config };
  },

  // 重新加载配置
  async reloadConfig() {
    await loadConfig();
    return this.getCurrentConfig();
  }
};