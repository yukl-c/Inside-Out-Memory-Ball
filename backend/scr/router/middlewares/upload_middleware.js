const multer = require('multer');
const path = require('path');

// 1. 設定儲存機制：使用記憶體儲存 (Memory Storage)
// 💡 為什麼？因為我們要直接把圖片 Buffer 丟給 AWS S3，不需要在後端伺服器留下實體檔案！
const storage = multer.memoryStorage();

// 2. 限制上傳檔案的條件 (食材安檢：防止用戶傳太大的檔案或奇怪的格式)
const limits = {
    fileSize: 5 * 1024 * 1024, // 🛑 限制檔案大小最大為 5MB
};

// 3. 檔案類型過濾器 (File Filter)
// 🔒 安全機制：只允許 JPEG, JPG, PNG 三種常見的圖片格式
const fileFilter = (req, file, cb) => {
    // 取得檔案副檔名並轉小寫
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        // 格式正確，允許通過 (true)
        cb(null, true);
    } else {
        // 格式不對，拋出錯誤給 Express 的錯誤處理器
        cb(new Error('不支援的檔案格式！只允許上傳 .png, .jpg, .jpeg 圖片。'), false);
    }
};

// 4. 實例化 Multer 配置
const upload = multer({
    storage: storage,
    limits: limits,
    fileFilter: fileFilter
});

// 5. 導出這個中介軟體
module.exports = upload;