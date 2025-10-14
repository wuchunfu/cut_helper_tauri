import Database from '@tauri-apps/plugin-sql';
import { v4 as uuidv4 } from 'uuid';
import { invoke } from '@tauri-apps/api/core';

var db = null;

export default {

  async init() {
    if (!db) {
      db = await Database.load('sqlite:cut.db');
    }
  },

  async addItem(content) {
    await this.init();
    const id = uuidv4(); // 生成 UUID
    const createTime = new Date().toISOString(); // 当前时间戳
    const MAX_HISTORY_LIMIT = 500; // 最大历史记录数量
    
    try {
      await db.execute(
        'INSERT INTO CutItems (id, content, createTime) VALUES (?, ?, ?)',
        [id, content, createTime]
      );
      
      // 检查记录总数，如果超过上限，删除最旧的记录
      const countResult = await db.select('SELECT COUNT(*) as count FROM CutItems');
      const totalCount = countResult[0].count;
      
      if (totalCount > MAX_HISTORY_LIMIT) {
        const deleteCount = totalCount - MAX_HISTORY_LIMIT;
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
    const MAX_HISTORY_LIMIT = 500;
    
    try {
      await db.execute(
        'INSERT INTO ImageItems (id, content, width, height, size, createTime) VALUES (?, ?, ?, ?, ?, ?)',
        [id, imageData.content, imageData.width, imageData.height, imageData.size, createTime]
      );
      
      // 检查记录总数，如果超过上限，删除最旧的记录
      const countResult = await db.select('SELECT COUNT(*) as count FROM ImageItems');
      const totalCount = countResult[0].count;
      
      if (totalCount > MAX_HISTORY_LIMIT) {
        const deleteCount = totalCount - MAX_HISTORY_LIMIT;
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
  }
};