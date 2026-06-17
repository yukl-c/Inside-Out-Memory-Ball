const db = require('../config/db');
const { uploadToS3, uploadAiUrlToS3, deleteFromS3 } = require('../config/s3');
const successMessage = require('../utils/status_messages').successMessage;
const errorMessage = require('../utils/status_messages').errorMessage;


// 🔄 輔助函式：檢查記憶球是否存在
async function checkMemoryball(memoryBallId, userId) {
    try {
        // 💡 修正：確保表格名稱與你 INSERT 的 memory_balls 一致
        const result = await db.query(
            'SELECT mb.*, c.character_name, c.character_looks_link FROM memory_balls mb JOIN characters c ON mb.character_id = c.character_id WHERE mb.mb_id = $1 AND mb.user_id = $2 AND mb.is_deleted = false', 
            [memoryBallId, userId]
        );
        return [result.rows[0] !== undefined, result.rows[0]];
    } catch(err) {
        console.error("❌ 檢查記憶球失敗:", err);
        return [false, null];
    }
}

// 創建記憶球圖片描述
async function createMemoryBallContentText (character_name, character_image_link, content, user_sketch_base64) {
    try {
        const response = await fetch(
            'http://localhost:5000/api/generate-memory-ball-text',
            {
                character_name: character_name, 
                character_image_link: character_image_link, 
                content: content, 
                user_sketch_base64: user_sketch_base64
            }
        );

        const result = await response.json();
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

// 創建記憶球圖片
async function createMemoryBallImage (title, scene_prompt, emotions, character_image_link, user_sketch_base64) {
    try {
        const response = await fetch(
            'http://localhost:5000/api/generate-memory-ball-image',
            {
                title: title, 
                scene_prompt: scene_prompt, 
                emotions: emotions, 
                character_image_link: character_image_link, 
                user_sketch_base64: user_sketch_base64
            }
        );

        const result = await response.json();
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

// 創建記憶球場景
async function createMemoryBallScene (req, res) {
    const { character_name, character_image_link, content, user_sketch_base64 } = req.body;

    if (!character_name) {
        return errorMessage(res, 400, '創建 Memory Ball 失敗：缺少 character_id 必填欄位');
    }

    if (!character_image_link) {
        return errorMessage(res, 400, '創建 Memory Ball 失敗：必須提供 Gemini AI 圖片網址 (character_image_link_link)');
    }

    try {
        const textServiceResult = await createMemoryBallContentText(character_name, character_image_link, content, user_sketch_base64);

        if (textServiceResult.status !== 'success') {
            return errorMessage(res, 522, 'Flask AI 文字生成微服務回應異常', textServiceResult.message);
        }

        const aiPromptTextData = JSON.parse(textServiceResult.data);
        const scenePrompt = aiPromptTextData.scene_prompt
        const sceneTitle = aiPromptTextData.title
        const sceneEmotions = aiPromptTextData.emotions

        const imageServiceResult = await createCharacterImage(characterPrompt, user_sketch_base64)

        if (imageServiceResult.status !== 'success') {
            return errorMessage(res, 522, 'Flask AI 圖片生成微服務回應異常', imageServiceResult.message);
        }

        const aiPromptImageData = JSON.parse(imageServiceResult.data);
        const sceneLink = aiPromptImageData.character_looks_link;

        return successMessage(res, 201, 'Flask AI 圖片生成微服務成功', {
            title: sceneTitle,
            emotions: sceneEmotions,
            scene_link: sceneLink
        }); 

    } catch (error) {
        console.error(error);
        return errorMessage(res, 500, 'Memory ball scene creation failed', error.message);
    }
}

// ➕ 1. 創建記憶球
async function createMemoryBall (req, res) {  
    const { mb_title, mb_content, mb_emotion, character_image_link, style } = req.body;
    const character_id = req.params.character_id;
    const currentUserId = req.user.userId;
    console.log('character id: ', character_id, " , user id: ", currentUserId);
    console.log(req.body);
    // 🔒 400 食材安檢：必填欄位檢查
    // if (!mb_title || !character_id || ! || !mb_emotion) {
    //     return errorMessage(res, 400, '創建 Memory Ball 失敗：缺少 mb_title, character_id,  或 mb_emotion 必填欄位');
    // }

    if (!mb_title) {
        return errorMessage(res, 400, '創建 Memory Ball 失敗：缺少 mb_title 必填欄位');
    }

    if (!character_id) {
        return errorMessage(res, 400, '創建 Memory Ball 失敗：缺少 character_id 必填欄位');
    }

    if (!currentUserId) {
        return errorMessage(res, 400, '創建 Memory Ball 失敗：缺少 user_id 必填欄位');
    }

    if (!mb_emotion) {
        return errorMessage(res, 400, '創建 Memory Ball 失敗：缺少 mb_emotion 必填欄位');
    }


    if (!character_image_link) {
        return errorMessage(res, 400, '創建 Memory Ball 失敗：必須提供 Gemini AI 圖片網址 (character_image_link_link)');
    }

    // 預先宣告救援與清理用的 S3 Key 變數
    let uploadedNewPhotoS3Key = null;
    let uploadedNewImageS3Key = null;
    let memoryBallPhotoLink = null;
    let memoryBallImageLink = null;

    try {
        // 📸 流程 A：處理用家自行上傳的實體照片
        if (req.file) {
            console.log("📸 偵測到用家自行上傳記憶球照片，啟動標準上傳流程...");
            const memoryBallPhotoS3Result = await uploadToS3(req.file, 'memory-ball-photo');
            memoryBallPhotoLink = memoryBallPhotoS3Result.imageUrl;
            uploadedNewPhotoS3Key = memoryBallPhotoS3Result.s3Key; // 紀錄新 Key 備用
        }
        
        // 🤖 流程 B：處理絕對存在的 Gemini AI 圖片網址，將其轉存至 S3
        console.log("🤖 啟動記憶球 AI 網址轉存 S3 流程...");
        const memoryBallImageS3Result = await uploadAiUrlToS3(character_image_link_link, 'memory-ball-image');
        memoryBallImageLink = memoryBallImageS3Result.imageUrl;
        uploadedNewImageS3Key = memoryBallImageS3Result.s3Key; // 紀錄新 Key 備用
        
        // 🗄️ SQL 寫入資料庫 (修正了原本末尾多出逗號以及欄位對不上的錯誤)
        const createSql = `INSERT INTO memory_balls (
            mb_title, 
            user_id,
            character_id, 
            style, 
            mb_photo_link, 
            mb_image_link, 
            mb_content, 
            mb_emotion
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`;
        
        const createParams = [
            mb_title, 
            currentUserId,
            character_id, 
            style || null, 
            memoryBallPhotoLink, 
            memoryBallImageLink, // 補上對應欄位
            mb_content || null, 
            mb_emotion
        ];

        const newMemoryBall = await db.query(createSql, createParams);
        return successMessage(res, 201, 'Memory Ball is created successfully', newMemoryBall.rows[0]);
    } catch (error) {
        console.error("🚨 創建記憶球失敗，啟動 S3 清理補償機制...");
        
        // 🛡️ 【原子性擦屁股機制】
        if (uploadedNewPhotoS3Key) {
            await deleteFromS3(uploadedNewPhotoS3Key);
        }
        if (uploadedNewImageS3Key) {
            await deleteFromS3(uploadedNewImageS3Key);
        }

        return errorMessage(res, 500, 'Memory Ball creation failed', error.message);
    }
}

// 📋 2. 獲取所有記憶球列表
async function getMemoryBallList (req, res) {
    const currentUserId = req.user.userId;
    try {
        const memoryBallListResult = await db.query(
            'SELECT mb.*, c.character_name, c.character_looks_link FROM memory_balls mb JOIN characters c ON mb.character_id = c.character_id WHERE mb.user_id = $1 AND mb.is_deleted = false', 
            [currentUserId]
        );
        return successMessage(res, 200, 'memory ball列表檢索成功', memoryBallListResult.rows);
    } catch (error) {
        console.error(error);
        return errorMessage(res, 500, 'memory ball列表檢索失敗', error.message);
    }  
}

// 🔍 3. 獲取單一記憶球
async function getMemoryBall (req, res) {
    const memoryBallId = req.params.memory_ball_id;
    const currentUserId = req.user.userId;
    try {
        const checkResult = await checkMemoryball(memoryBallId, currentUserId);
        if (!checkResult[0]) {
            return errorMessage(res, 404, `檢索失敗：找不到 ID 為 ${memoryBallId} 的 memory ball`);
        }
        return successMessage(res, 200, 'memory ball檢索成功', checkResult[1]);
    } catch (error) {
        console.error(error);
        return errorMessage(res, 500, 'memory ball檢索失敗', error.message);
    }
}

// ✏️ 4. 調整後的更新記憶球（完美對接同步連貫邏輯）
async function updateMemoryBall (req, res) {
    const currentUserId = req.user.userId;
    const memoryBallId = req.params.memory_ball_id; // 💡 統一使用路由參數名稱
    const { mb_title, mb_content, mb_emotion, character_id, character_image_link_link, style } = req.body;

    console.log("📥 收到更新記憶球請求:", { memoryBallId, ...req.body });

    // 🔒 400 食材安檢一：必填檢查
    if (!mb_title || !mb_emotion || !character_id || !memoryBallId) {
        return errorMessage(res, 400, '更新 Memory Ball 失敗：缺少必填欄位');
    }
    if (!character_image_link_link) {
        return errorMessage(res, 400, '更新 Memory Ball 失敗：必須提供 Gemini AI 圖片網址 (character_image_link_link)');
    }

    // 預先宣告這一次「新上傳成功」的 S3 Key (救援與擦屁股用)
    let uploadedNewPhotoS3Key = null;
    let uploadedNewImageS3Key = null;

    let memoryBallPhotoLink = null;
    let memoryBallImageLink = null;

    // 預先紀錄「過期舊檔案的 S3 Key」，若成功則斷捨離刪除
    let oldPhotoS3Key = null;
    let oldImageS3Key = null;

    try {
        // 🔍 步驟 1：先確認記憶球是否存在並撈出舊檔案
        const checkResult = await checkMemoryball(memoryBallId, currentUserId);
        if (!checkResult[0]) {
            return errorMessage(res, 404, `更新失敗：找不到 ID 為 ${memoryBallId} 的 memory ball`);
        }

        const oldMemoryData = checkResult[1];
        memoryBallPhotoLink = oldMemoryData.mb_photo_link;
        memoryBallImageLink = oldMemoryData.mb_image_link;

        // 從舊網址解出 Key
        if (oldMemoryData.mb_photo_link) {
            oldPhotoS3Key = oldMemoryData.mb_photo_link.split('.com/')[1];
        }
        if (oldMemoryData.mb_image_link) {
            oldImageS3Key = oldMemoryData.mb_image_link.split('.com/')[1];
        }

        // 📸 步驟 2：處理用家新上傳的實體照片
        if (req.file) {
            console.log("📸 偵測到用家更新上傳記憶球圖片...");
            const memoryBallPhotoS3Result = await uploadToS3(req.file, 'memory-ball-photo');
            memoryBallPhotoLink = memoryBallPhotoS3Result.imageUrl;
            uploadedNewPhotoS3Key = memoryBallPhotoS3Result.s3Key;
        }

        // 🤖 步驟 3：處理最新的 Gemini AI 圖片網址並轉存
        console.log("🤖 啟動新記憶球 AI 網址轉存 S3...");
        const memoryBallImageS3Result = await uploadAiUrlToS3(character_image_link_link, 'memory-ball-image');
        memoryBallImageLink = memoryBallImageS3Result.imageUrl;
        uploadedNewImageS3Key = memoryBallImageS3Result.s3Key;

        const updated_at = new Date();

        // 🗄️ 步驟 4：拋棄 Array 舊寫法，正式更新 AWS RDS PostgreSQL 資料庫
        const updateSql = `UPDATE memory_balls 
            SET mb_title = $1, 
                character_id = $2,  
                style = $3, 
                mb_photo_link = $4, 
                mb_image_link = $5, 
                mb_content = $6, 
                mb_emotion = $7,
                updated_at = $8
            WHERE mb_id = $9
            RETURNING *`;

        const updateParams = [
            mb_title,
            character_id,
            style || null,
            memoryBallPhotoLink,
            memoryBallImageLink,
            mb_content || null,
            mb_emotion,
            updated_at,
            memoryBallId
        ];

        const updateResult = await db.query(updateSql, updateParams);

        // 🎉 成功防線：【斷捨離】舊垃圾清理
        if (req.file && oldPhotoS3Key) {
            console.log(`🧹 更新成功！非同步清理過期舊記憶球照片: ${oldPhotoS3Key}`);
            deleteFromS3(oldPhotoS3Key).catch(err => console.error(err));
        }
        if (oldImageS3Key) {
            console.log(`🧹 更新成功！非同步清理過期舊 AI 記憶球圖片: ${oldImageS3Key}`);
            deleteFromS3(oldImageS3Key).catch(err => console.error(err));
        }

        return successMessage(res, 200, 'Memory Ball updated successfully', updateResult.rows[0]);
    } catch (error) {
        console.error("🚨 更新記憶球失敗，啟動 S3 新檔案清理補償機制...");
        
        // 🛡️ 【擦屁股防線】
        if (uploadedNewPhotoS3Key) {
            console.log(`🗑️ 清理因更新失敗殘留的新實體圖片: ${uploadedNewPhotoS3Key}`);
            await deleteFromS3(uploadedNewPhotoS3Key);
        }
        if (uploadedNewImageS3Key) {
            console.log(`🗑️ 清理因更新失敗殘留的新 AI 圖片: ${uploadedNewImageS3Key}`);
            await deleteFromS3(uploadedNewImageS3Key);
        }

        return errorMessage(res, 500, 'Memory Ball update failed', error.message);
    }
}

// ❌ 5. 刪除記憶球
async function deleteMemoryBall (req, res) {
    const currentUserId = req.user.userId;
    const memoryBallId = req.params.memory_ball_id;
    try {
        const checkResult = await checkMemoryball(memoryBallId, currentUserId);
        if (!checkResult[0]) {
            return errorMessage(res, 404, `檢索失敗：找不到 ID 為 ${memoryBallId} 的 memory ball`);
        }

        // Change from hard DELETE to soft-delete UPDATE
        await db.query(
            `UPDATE memory_balls 
             SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP 
             WHERE mb_id = $1`, 
            [memoryBallId]
        );
        
        return successMessage(res, 200, `ID 為 ${memoryBallId} 的 memory ball 已成功移至回收桶（30天後自動永久刪除）`);
    } catch (error) {
        console.error(error);
        return errorMessage(res, 500, 'memory ball 刪除失敗', error.message);
    }
}  

module.exports = {
    createMemoryBallScene,
    createMemoryBall,
    getMemoryBallList,
    getMemoryBall,
    updateMemoryBall,
    deleteMemoryBall
};