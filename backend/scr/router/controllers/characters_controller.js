const db = require('../config/db');
const axios = require('axios');
const multer = require('multer');      
const FormData = require('form-data');
const { uploadToS3, uploadAiUrlToS3, uploadAiBase64ToS3, deleteFromS3 } = require('../config/s3');
const successMessage = require('../utils/status_messages').successMessage;
// exports.successMessage = successMessage;
const errorMessage = require('../utils/status_messages').errorMessage;
// exports.errorMessage = errorMessage;

const upload = multer();

async function checkCharacter(userId, characterId) {
    try {
        const result = await db.query('SELECT * FROM characters WHERE character_id = $1 AND user_id = $2 AND is_deleted = false', [characterId, userId]);
        return [result.rows[0] !== undefined, result.rows[0]];
    } catch(err) {
        console.error(err);
        return [false, null];
    }
}
exports.checkCharacter = checkCharacter;

// 創建角色圖片描述
async function createCharacterContentText (image_file=null, character_name, gender, species, style=null, description=null, user_sketch_url=null) {
    const form = new FormData();

    if (image_file && image_file.buffer) {
        form.append('file', image_file.buffer, {
            filename: image_file.originalname,
            contentType: image_file.mimetype
        });
    }
    

    form.append('character_name', character_name);
    form.append('gender', gender);
    form.append('species', species);
    form.append('style', style || 'Pixar');
    form.append('description', description || '');
    if (user_sketch_url) form.append('user_sketch_url', user_sketch_url);

    try {
        const response = await axios.post(
            'http://localhost:5000/api/generate-character-text',
            form,
            {
                headers: {...form.getHeaders()}
            }

        )

        const character_prompt = JSON.parse(response.data.data).character_prompt;

        console.log(`character prompt: ${character_prompt}`);
        return response.data; 

    } catch (error) {
        console.error("❌ 呼叫 Flask character文字生成服務失敗:", error);
        throw error;
    }
}

// 創建角色圖片
async function createCharacterImage (image_file=null, character_prompt, user_sketch_url=null) {
    const form = new FormData();

    if (image_file && image_file.buffer) {
        form.append('file', image_file.buffer, {
            filename: image_file.originalname,
            contentType: image_file.mimetype
        });
    }

    form.append('character_prompt', character_prompt);
    if (user_sketch_url) form.append('user_sketch_url', user_sketch_url);

    try {
        const response = await axios.post(
            'http://localhost:5000/api/generate-character-image',
            form,
            {
                headers: {...form.getHeaders()}
            }

        )

        console.log('image base 64: ',response.data.character_looks_base64);
        return response.data;

    } catch (error) {
        console.error(error);
        throw error;
    }
}

// 創建角色外貌
async function createCharacterLook (req, res) {
    const { character_name, gender, species, style, description, user_sketch_url } = req.body;

    const image_file = req.file || null;

    if (!character_name || !gender || !species) {
        return errorMessage(res, 400, '創建角色内容失敗：缺少 character_name, gender 或 species 必填欄位');
    }

    try {
        const textServiceResult = await createCharacterContentText(
            image_file, 
            character_name, 
            gender, 
            species, 
            style, 
            description,  
            user_sketch_url
        );

        if (textServiceResult.status !== 'success') {
            return errorMessage(res, 522, 'Flask AI 文字生成微服務回應異常', textServiceResult.message);
        }

        const aiPromptTextData = typeof textServiceResult.data === 'string' ? JSON.parse(textServiceResult.data) : textServiceResult.data;        
        const characterPrompt = aiPromptTextData.character_prompt;

        const imageServiceResult = await createCharacterImage(image_file, characterPrompt, user_sketch_url)

        console.log(`imageServiceResult: ${JSON.stringify(imageServiceResult.status)}`)
        if (imageServiceResult.status !== 'success') {
            return errorMessage(res, 522, 'Flask AI character 圖片生成微服務回應異常', imageServiceResult.message);
        }

        const characterLooksBase64 = imageServiceResult.character_looks_base64;

        if (!characterLooksBase64) {
            return errorMessage(res, 522, 'Flask AI 服務異常：未成功取得圖片 Base64 數據');
        }

        return successMessage(res, 201, 'Flask AI character 圖片生成微服務成功', characterLooksBase64); // only respond the character looks link

    } catch (error) {
        console.error("🚨 串聯 AI 微服務時發生崩潰:", error);
        return errorMessage(res, 500, 'Character look creation failed', error.message);
    }
}


// ➕ 1. 創建角色
async function createCharacter (req, res) {
    // const { character_name, gender, species, style, description, ai_generated_url } = req.body;
    const { character_name, gender, species, style, description, ai_generated_base64 } = req.body;
    const currentUserId = req.user.userId;

    // 🔒 400 食材安檢 (必填欄位檢查 + return 阻斷)
    if (!currentUserId || !character_name || !gender || !species) {
        return errorMessage(res, 400, '創建角色失敗：缺少 user_id, character_name, gender 或 species 必填欄位');
    }

    // if (!ai_generated_url) {
    if (!ai_generated_base64) {   
        return errorMessage(res, 400, '創建角色失敗：必須提供 Gemini AI 圖片網址 (ai_generated_url)');
    }

    // 預先宣告救援用的 S3 Key
    let uploadedcharacterPhotoS3Key = null;
    let uploadedcharacterLooksS3Key = null;
    let characterPhotoLink = null;
    let characterLooksLink = null;

    try {
        if (req.file) {
            // 👉 用家自己上傳了圖片檔案
            console.log("📸 偵測到用家自行上傳圖片，啟動標準上傳流程...");
            const characterPhotoS3Result = await uploadToS3(req.file, 'character-photo');
            characterPhotoLink = characterPhotoS3Result.imageUrl;
            console.log("📤 用家上傳的圖片已成功儲存在 S3，連結如下：", characterPhotoLink);
            uploadedcharacterPhotoS3Key = characterPhotoS3Result.s3Key;
        }

        // const CharacterLooksS3Result = await uploadAiUrlToS3(ai_generated_url, 'character-looks');
        const CharacterLooksS3Result = await uploadAiBase64ToS3(ai_generated_base64, 'character-looks');
        characterLooksLink = CharacterLooksS3Result.imageUrl;
        console.log("📤 AI 生成的圖片已成功儲存在 S3，連結如下：", characterLooksLink);
        uploadedcharacterLooksS3Key = CharacterLooksS3Result.s3Key;

        const createSql = `INSERT INTO characters (
            character_name, 
            gender, 
            species, 
            style, 
            description, 
            character_photo_link, 
            character_looks_link, 
            user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`;
        const createParams = [
            character_name, gender, species, style || null, description || null, characterPhotoLink || null, characterLooksLink, currentUserId
        ]
        const newCharacter = await db.query(createSql, createParams);
        return successMessage(res, 201, 'Character is created successfully', newCharacter);
    } catch (error) {
        if (uploadedcharacterPhotoS3Key) await deleteFromS3(uploadedcharacterPhotoS3Key);
        if (uploadedcharacterLooksS3Key) await deleteFromS3(uploadedcharacterLooksS3Key);
        console.error(error);
        return errorMessage(res, 500, 'Character creation failed', error.message);
    }
}

// 📋 2. 獲取所有角色列表
async function getCharacterList (req, res) {
    const currentUserId = req.user.userId;
    try {
        const characterListResult = await db.query('SELECT * FROM characters WHERE user_id = $1 AND is_deleted = false', [currentUserId]);
        const character_list = characterListResult.rows;
        return successMessage(res, 200, '角色列表檢索成功', character_list);
    } catch (error) {
        console.error(error);
        return errorMessage(res, 500, '角色列表檢索失敗', error.message);
    }  
}

// 🔍 3. 獲取單一角色
async function getCharacter (req, res) {
    const currentUserId = req.user.userId;

    const characterId = req.params.character_id;

    try {
        const checkResult = await checkCharacter(currentUserId, characterId);
        
        // 🔒 404 檢查（修正你原本寫法在 try 外面且變數名稱錯植的隱患）
        if (!checkResult[0]) {
            return errorMessage(res, 404, `檢索失敗：找不到 ID 為 ${characterId} 的角色`);
        }

        return successMessage(res, 200, '角色檢索成功', checkResult[1]);
    } catch (error) {
        console.error(error);
        return errorMessage(res, 500, '角色檢索失敗', error.message);
    }
}

// ✏️ 4. 更新角色資料（同步連貫 S3 安全清理機制）
async function updateCharacter (req, res) {
    const characterId = req.params.character_id;
    // const { character_name, gender, species, style, description, ai_generated_url } = req.body;
    const { character_name, gender, species, style, description, ai_generated_base64 } = req.body;

    // 🔒 400 食材安檢一：必填欄位檢查
    if (!character_name || !gender || !species) {
        return errorMessage(res, 400, '更新角色失敗：缺少 character_name, gender 或 species 必填欄位');
    }

    // 🔒 400 食材安檢二：延續你的業務邏輯，更新時如果傳了新資料，ai_generated_url 是否也是必填？
    // 💡 註：這裡假設更新時也必須帶著最新的 ai_generated_url 網址。
    // if (!ai_generated_url) {
    if (!ai_generated_base64) {
        return errorMessage(res, 400, '更新角色失敗：必須提供 Gemini AI 圖片網址 (ai_generated_url)');
    }

    // 預先宣告這一次「新上傳成功」的 S3 Key (救援與擦屁股用)
    let uploadedNewPhotoS3Key = null;
    let uploadedNewLooksS3Key = null;

    // 預先宣告最終要寫入資料庫的網址變數
    let characterPhotoLink = null;
    let characterLooksLink = null;

    // 預先紀錄「舊檔案的 S3 Key」，若更新成功，要用來做斷捨離刪除
    let oldPhotoS3Key = null;
    let oldLooksS3Key = null;

    try {
        // 🔍 步驟 1：先檢查該角色是否存在，並撈出舊資料
        const checkResult = await checkCharacter(characterId);        
        if (!checkResult[0]) {
            return errorMessage(res, 404, `更新失敗：找不到 ID 為 ${characterId} 的角色`);
        }

        const oldCharacterData = checkResult[1];
        
        // 先預設繼承舊的圖片網址
        characterPhotoLink = oldCharacterData.character_photo_link;
        characterLooksLink = oldCharacterData.character_looks_link;

        // 🧠 解析出舊檔案的 S3 Key (假設你的網址結尾包含 S3 Key，實務上可用解析或在 DB 獨立存 Key)
        // 這裡為了保險，先從舊網址試著還原 Key，或是你有獨立欄位存 Key。
        // 如果舊資料有網址，我們才去紀錄它，以便成功後刪除。
        if (oldCharacterData.character_photo_link) {
            // 簡單示範：從 URL 切出 Key。例如 URL 是 https://...amazonaws.com/character-photo/abc.jpg
            // 切出來會是 character-photo/abc.jpg
            oldPhotoS3Key = oldCharacterData.character_photo_link.split('.com/')[1];
        }
        if (oldCharacterData.character_looks_link) {
            oldLooksS3Key = oldCharacterData.character_looks_link.split('.com/')[1];
        }

        // 📸 步驟 2：處理用家新上傳的實體照片
        if (req.file) {
            console.log("📸 偵測到用家更新上傳圖片，啟動標準上傳流程...");
            const characterPhotoS3Result = await uploadToS3(req.file, 'character-photo');
            characterPhotoLink = characterPhotoS3Result.imageUrl;
            uploadedNewPhotoS3Key = characterPhotoS3Result.s3Key; // 🔍 紀錄新 Key！
        } 

        // 🤖 步驟 3：處理最新的 Gemini AI 圖片網址並轉存
        if (ai_generated_base64) {
            console.log("🤖 啟動新 AI 網址轉存 S3 流程...");
            const CharacterLooksS3Result = await uploadAiBase64ToS3(ai_generated_base64, 'character-looks');
            characterLooksLink = CharacterLooksS3Result.imageUrl;
            uploadedNewLooksS3Key = CharacterLooksS3Result.s3Key; // 🔍 紀錄新 Key！
        }
        

        const updated_at = new Date();

        // 🗄️ 步驟 4：執行 SQL 更新資料庫
        const updateSql = `UPDATE characters 
            SET character_name = $1, 
                gender = $2, 
                species = $3, 
                style = $4, 
                description = $5, 
                character_photo_link = $6, 
                character_looks_link = $7, 
                updated_at = $8
            WHERE character_id = $9
            RETURNING *`;

        const updateParams = [
            character_name,
            gender,
            species,
            style || null,
            description || null,
            characterPhotoLink,
            characterLooksLink,
            updated_at,
            characterId
        ];   
        
        const updateResult = await db.query(updateSql, updateParams);

        // 🎉 成功防線：走到這裡代表資料庫成功更新了！
        // 💥 【斷捨離機制】：既然新圖片成功上任，舊的圖片在 S3 上就是垃圾了，立刻刪除它們！
        if (req.file && oldPhotoS3Key) {
            console.log(`🧹 更新成功！正在非同步清理過期的舊實體圖片: ${oldPhotoS3Key}`);
            // 💡 這裡不一定要 await，讓它背景執行即可，不耽誤前端拿回傳值
            deleteFromS3(oldPhotoS3Key).catch(err => console.error("清理舊圖片失敗:", err));
        }
        if (oldLooksS3Key) {
            console.log(`🧹 更新成功！正在非同步清理過期的舊 AI 圖片: ${oldLooksS3Key}`);
            deleteFromS3(oldLooksS3Key).catch(err => console.error("清理舊 AI 圖片失敗:", err));
        }

        return successMessage(res, 200, '角色更新成功', updateResult.rows[0]);    

    } catch (error) {
        console.error("🚨 更新角色失敗，啟動 S3 新檔案清理補償機制...");
        
        // 🛡️ 【擦屁股防線 1】：如果更新失敗，但剛才有成功上傳用家新照片，立刻移除新照片
        if (uploadedNewPhotoS3Key) {
            console.log(`🗑️ 正在清理因更新失敗殘留的新實體圖片: ${uploadedNewPhotoS3Key}`);
            await deleteFromS3(uploadedNewPhotoS3Key);
        }

        // 🛡️ 【擦屁股防線 2】：如果更新失敗，但剛才 AI 網址有轉存成功，立刻將新轉存的檔案擦乾淨
        if (uploadedNewLooksS3Key) {
            console.log(`🗑️ 正在清理因更新失敗殘留的新 AI 圖片: ${uploadedNewLooksS3Key}`);
            await deleteFromS3(uploadedNewLooksS3Key);
        }

        return errorMessage(res, 500, '角色更新失敗', error.message);
    }
}

// ❌ 5. 刪除角色
async function deleteCharacter (req, res) {
    const characterId = req.params.character_id;

    try {
        const checkResult = await checkCharacter(characterId);
        
        if (!checkResult[0]) {
            return errorMessage(res, 404, `檢索失敗：找不到 ID 為 ${characterId} 的角色`);
        }

        // Change from hard DELETE to soft-delete UPDATE
        const deleteResult = await db.query(
            `UPDATE characters 
             SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP 
             WHERE character_id = $1`,
            [characterId]
        );
        
        return successMessage(res, 200, `ID 為 ${characterId} 的角色已成功移至回收桶（30天後自動永久刪除）`);
    } catch (error) {
        console.error(error);
        return errorMessage(res, 500, '角色刪除失敗', error.message);
    }
}

module.exports = {
    createCharacterLook,
    createCharacter,
    getCharacterList,
    getCharacter,
    updateCharacter,
    deleteCharacter
};