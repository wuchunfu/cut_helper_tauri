import Database from '@tauri-apps/plugin-sql';
import { v4 as uuidv4 } from 'uuid';
let db = await Database.load('sqlite:cut.db');;

export default {

  async addItem(content) {
    const id = uuidv4(); // 生成 UUID
    const createTime = new Date().toISOString(); // 当前时间戳
    try {
      await db.execute(
        'INSERT INTO CutItems (id, content, createTime) VALUES (?, ?, ?)',
        [id, content, createTime]
      );
    } catch (error) {
      console.error('Error adding item:', error);
    }
  },

  async fetchItems() {
    try {
      const result = await db.select('SELECT * FROM CutItems');
      console.log("query:",result)
      return result;
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  }
};