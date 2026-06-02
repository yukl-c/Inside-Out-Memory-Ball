// config/db.js
const { Pool } = require('pg');

// 建立資料庫連線池 (Pool)
// ⚠️ 導師提醒：正式上線時，請將這些敏感資訊移至 .env 檔案中，避免密碼外洩！
const pool = new Pool({
    host: 'memory-ball-project.ck9a62kg66rq.us-east-1.rds.amazonaws.com', // AWS RDS 的 Endpoint 端點
    user: 'postgres',
    password: 'memoryball',
    database: 'postgres',
    port: 5432, // PostgreSQL 預設連接埠
    ssl: {
        rejectUnauthorized: false // AWS RDS 通常強制要求 SSL 加密連線，此設定可確保安全通訊
    }
});

// 🚀 核心測試機制：嘗試連線
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ AWS RDS 連線失敗，原因：', err.stack);
    }
    console.log('✅ 成功連線上 AWS RDS PostgreSQL 雲端資料庫！');
    release(); // 釋放連線回到連線池
});

// 匯出通用 query 方法，供各大 Controller 使用
module.exports = {
    query: (text, params) => pool.query(text, params)
};