import Database from '@tauri-apps/plugin-sql';
import { v4 as uuidv4 } from 'uuid';

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
    try {
      await db.execute(
        'INSERT INTO CutItems (id, content, createTime) VALUES (?, ?, ?)',
        [id, content, createTime]
      );
      return {"id":id,"content":content,"createTime":createTime}
    } catch (error) {
      console.error('Error adding item:', error);
    }
  },

  async fetchItems() {
    await this.init();
    try {
      const result = await db.select('SELECT * FROM CutItems order by createTime desc');
      return result;
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  },

  async removeItem(id) {
    await this.init();
    try {
      await db.execute('DELETE FROM CutItems WHERE id =?',[id]);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  }
};