use sqlx::FromRow;
use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
struct CutItem {
    id: Uuid,
    content: String,
    create_time: NaiveDateTime,
}
