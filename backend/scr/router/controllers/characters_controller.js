const successMessage = require('../utils/status_messages').successMessage;
const errorMessage = require('../utils/status_messages').errorMessage;

// 🎯 根據 PostgreSQL schema 建立的 Mock Data 陣列
let character_list = [
    {
        "character_id": 1,
        "user_id": 1,
        "character_name": "Riley",
        "gender": "Female",
        "species": "Human",
        "description": "The main core person.",
        "character_photo_link": "https://my-bucket.s3.amazonaws.com/riley_avatar.jpg",
        "character_looks_link": "https://my-bucket.s3.amazonaws.com/riley_looks.jpg",
        "created_at": new Date(),
        "updated_at": new Date()
    },
    {
        "character_id": 2,
        "user_id": 1,
        "character_name": "Joy",
        "gender": "Female",
        "species": "Emotion",
        "description": "Always full of energy.",
        "character_photo_link": "https://my-bucket.s3.amazonaws.com/joy_avatar.jpg",
        "character_looks_link": "https://my-bucket.s3.amazonaws.com/joy_looks.jpg",
        "created_at": new Date(),
        "updated_at": new Date()
    }
];

// ➕ 1. 創建角色
async function createCharacter (req, res) {
    // 嚴格對照資料庫要求的必填欄位 (NOT NULL)
    const { user_id, character_name, character_looks_link, gender, species, description, character_photo_link } = req.body;

    // 🔒 400 食材安檢 (必填欄位檢查 + return 阻斷)
    if (!user_id || !character_name || !character_looks_link) {
        return errorMessage(res, 400, '創建角色失敗：缺少 user_id, character_name 或 character_looks_link 必填欄位');
    }

    try {
        // 模擬 SQL 欄位建立與預設值 (TIMESTAMPTZ)
        const newCharacter = {
            "character_id": character_list.length + 1,
            "user_id": parseInt(user_id),
            "character_name": character_name,
            "gender": gender || null,
            "species": species || null,
            "description": description || null,
            "character_photo_link": character_photo_link || null,
            "character_looks_link": character_looks_link,
            "created_at": new Date(),
            "updated_at": new Date()
        };

        character_list.push(newCharacter);
        return successMessage(res, 201, 'Character is created successfully', newCharacter);
    } catch (error) {
        console.error(error);
        return errorMessage(res, 500, 'Character creation failed', error.message);
    }
}

// 📋 2. 獲取所有角色列表
async function getCharacterList (req, res) {
    try {
        return successMessage(res, 200, '角色列表檢索成功', character_list);
    } catch (error) {
        console.error(error);
        return errorMessage(res, 500, '角色列表檢索失敗', error.message);
    }  
}

// 🔍 3. 獲取單一角色
async function getCharacter (req, res) {
    const characterId = parseInt(req.params.id);

    try {
        const character = character_list.find(c => c.character_id === characterId);
        
        // 🔒 404 檢查（修正你原本寫法在 try 外面且變數名稱錯植的隱患）
        if (!character) {
            return errorMessage(res, 404, `檢索失敗：找不到 ID 為 ${characterId} 的角色`);
        }

        return successMessage(res, 200, '角色檢索成功', character);
    } catch (error) {
        console.error(error);
        return errorMessage(res, 500, '角色檢索失敗', error.message);
    }
}

// ✏️ 4. 更新角色資料
async function updateCharacter (req, res) {
    const characterId = parseInt(req.params.id);
    const { character_name, gender, species, description, character_photo_link, character_looks_link } = req.body;

    try {
        const characterIndex = character_list.findIndex(c => c.character_id === characterId);
        
        if (characterIndex === -1) {
            return errorMessage(res, 404, `更新失敗：找不到 ID 為 ${characterId} 的角色`);
        }

        // 模擬 SQL UPDATE：如果有傳新欄位就更新，並自動重置 updated_at [cite: 68]
        if (character_name) character_list[characterIndex].character_name = character_name;
        if (gender !== undefined) character_list[characterIndex].gender = gender;
        if (species !== undefined) character_list[characterIndex].species = species;
        if (description !== undefined) character_list[characterIndex].description = description;
        if (character_photo_link !== undefined) character_list[characterIndex].character_photo_link = character_photo_link;
        if (character_looks_link) character_list[characterIndex].character_looks_link = character_looks_link;
        
        character_list[characterIndex].updated_at = new Date();

        return successMessage(res, 200, '角色更新成功', character_list[characterIndex]);    
    } catch (error) {
        console.error(error);
        return errorMessage(res, 500, '角色更新失敗', error.message);
    }
}

// ❌ 5. 刪除角色
async function deleteCharacter (req, res) {
    const characterId = parseInt(req.params.id);

    try {
        const characterExists = character_list.some(c => c.character_id === characterId);

        if (!characterExists) {
            return errorMessage(res, 404, `刪除失敗：找不到 ID 為 ${characterId} 的角色`);
        }

        // 模擬 SQL DELETE FROM characters WHERE character_id = id
        character_list = character_list.filter(c => c.character_id !== characterId);
        return successMessage(res, 200, `ID 為 ${characterId} 的角色已成功刪除`);
    } catch (error) {
        console.error(error);
        return errorMessage(res, 500, '角色刪除失敗', error.message);
    }
} 

module.exports = {
    createCharacter,
    getCharacterList,
    getCharacter,
    updateCharacter,
    deleteCharacter
};