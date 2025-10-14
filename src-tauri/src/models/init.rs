use sqlx::{sqlite::SqlitePool, Pool, Sqlite};
use sqlx::migrate::MigrateDatabase;
use uuid::Uuid;
use chrono::Utc;

// 检查历史记录表
fn checkCutItem(pool:SqlitePool) -> bool {
   
}

// 初始化数据库表
pub fn ini_model() {
    let db_url = "sqlite://test.db";
    // 判断数据库是否存在
    if !Sqlite::database_exists(db_url).await.unwrap_or(false) {
        Sqlite::create_database(db_url).await?;
    }
    // 创建数据库连接池
    let pool = SqlitePool::connect(db_url).await?;
    checkCutItem(pool)
}



