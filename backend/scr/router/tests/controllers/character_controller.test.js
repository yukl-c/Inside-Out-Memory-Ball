// 📄 tests/controllers/characters_controller.test.js

// 1. 🛡️ 核心防禦：搶先 Mock 所有外部基礎依賴
jest.mock('../../config/db', () => ({
    query: jest.fn()
}));

jest.mock('../../config/s3', () => ({
    uploadToS3: jest.fn(),
    uploadAiBase64ToS3: jest.fn(),
    deleteFromS3: jest.fn()
}));

jest.mock('axios');

const db = require('../../config/db');
const { uploadToS3, uploadAiBase64ToS3, deleteFromS3 } = require('../../config/s3');
const axios = require('axios');
const { createCharacterLook, createCharacter, updateCharacter } = require('../../controllers/characters_controller');

// 💡 2. 引入剛才建立的樂樂 Joy 實體 Base64 碼
const joyImageBase64 = require('../fixtures/joyImage');

describe('🎬 Characters Controller 實戰單元測試集', () => {
    let req, res;

    beforeEach(() => {
        req = { body: {}, user: {}, params: {}, file: null };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    // =========================================================================
    // ➕ 測試：createCharacter (正式使用 Joy 實體照片測試 S3 解碼上傳)
    // =========================================================================
    describe('▶️ createCharacter() 測試', () => {
        it('🎯 成功創建：傳入 Joy 的 Base64，成功解碼並寫入 RDS，應回傳 201', async () => {
            req.user = { userId: 42 };
            req.body = { 
                character_name: '樂樂 Joy', 
                gender: 'female', 
                species: 'Emotion', 
                // 🔒 將真實的 Joy 圖片碼帶入測試欄位中
                ai_generated_base64: joyImageBase64 
            };
            req.file = { buffer: Buffer.from('fake_user_sketch'), originalname: 'sketch.jpg', mimetype: 'image/jpeg' };

            // 🎭 劇本設定：S3 加密處理模擬
            uploadToS3.mockResolvedValueOnce({ imageUrl: 'https://s3/sketch.jpg', s3Key: 'photo-key' });
            uploadAiBase64ToS3.mockResolvedValueOnce({ imageUrl: 'https://s3/joy-turnaround.jpg', s3Key: 'ai-key' });
            
            // 資料庫寫入模擬
            db.query.mockResolvedValueOnce({ rows: [{ character_id: 1, character_name: '樂樂 Joy' }] });

            await createCharacter(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            // 驗證 S3 確實有被呼叫，且第一個參數傳入的是真實的 Joy 圖片碼
            expect(uploadAiBase64ToS3).toHaveBeenCalledWith(joyImageBase64, 'character-looks');
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO characters'), expect.any(Array));
        });

        it('🔒 食材安檢：若缺少 ai_generated_base64 欄位時，應立刻攔截回傳 400', async () => {
            req.user = { userId: 42 };
            req.body = { character_name: '樂樂 Joy', gender: 'female', species: 'Emotion' }; // 💥 漏了 ai_generated_base64

            await createCharacter(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: '創建角色失敗：必須提供 Gemini AI 圖片網址 (ai_generated_url)'
            }));
        });
    });

    // =========================================================================
    // ✏️ 測試：updateCharacter (更新時的 Base64 清理機制)
    // =========================================================================
    describe('▶️ updateCharacter() 測試', () => {
        it('🎯 成功更新：傳入新 Joy 的 Base64 更新角色資料，應啟動斷捨離機制並回傳 200', async () => {
            req.params = { character_id: 1 };
            req.body = { 
                character_name: '新樂樂', 
                gender: 'female', 
                species: 'Emotion', 
                ai_generated_base64: joyImageBase64 
            };

            // 🎭 劇本設定：模擬先撈出舊檔案的 S3 網址，以供成功後刪除舊檔
            db.query.mockResolvedValueOnce({ 
                rows: [{ 
                    character_id: 1,
                    character_photo_link: 'https://s3.amazonaws.com/character-photo/old_user.jpg',
                    character_looks_link: 'https://s3.amazonaws.com/character-looks/old_ai.jpg'
                }] 
            });

            // 模擬新 Base64 轉存 S3 成功
            uploadAiBase64ToS3.mockResolvedValueOnce({ imageUrl: 'https://s3/new_joy.jpg', s3Key: 'new-ai-key' });
            // 模擬資料庫 UPDATE 成功
            db.query.mockResolvedValueOnce({ rows: [{ character_id: 1, character_name: '新樂樂' }] });

            await updateCharacter(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            // 🔒 驗證斷捨離機制：資料庫更新成功後，應自動背後呼叫 deleteFromS3 清理舊的 AI 圖片
            expect(deleteFromS3).toHaveBeenCalledWith('character-looks/old_ai.jpg');
        });
    });
});