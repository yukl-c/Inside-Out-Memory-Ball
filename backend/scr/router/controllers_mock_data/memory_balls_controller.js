const successMessage = require('../utils/status_messages').successMessage;
const errorMessage = require('../utils/status_messages').errorMessage;

let memory_ball_list = [
    {
        "mb_id": 1,
        "mb_title": "Sample Memory Ball",
        "character_id": 1,
        "character_look_link": "https://my-bucket.s3.amazonaws.com/sample_character_look.jpg",
        "mb_content": "This is a sample memory ball for testing purposes.",
        "mb_image_link": "https://my-bucket.s3.amazonaws.com/sample_memory_ball.jpg",
        "mb_emotion": "joy",
        "created_at": new Date(),
        "updated_at": new Date()
    },
    {
        "mb_id": 2,
        "mb_title": "Another Memory Ball",
        "character_id": 2,
        "character_look_link": "https://my-bucket.s3.amazonaws.com/another_character_look.jpg",
        "mb_photo_link": "https://my-bucket.s3.amazonaws.com/another_memory_ball.jpg",
        "mb_image_link": "https://my-bucket.s3.amazonaws.com/another_memory_ball.jpg",
        "mb_emotion": "sadness",
        "created_at": new Date(),
        "updated_at": new Date()
    }
];

async function createMemoryBall (req, res) {  
    const { mb_title, character_id, character_look_link, mb_content, mb_photo_link, mb_image_link, mb_emotion } = req.body;

    if (!mb_title || !character_id || !character_look_link || !mb_image_link || !mb_emotion) {
        return errorMessage(res, 400, '創建 Memory Ball 失敗：缺少 mb_title, character_id, character_look_link 或 mb_content 必填欄位');
    }

    try {
        const newMemoryBall = {
            "mb_id": memory_ball_list.length + 1,
            "mb_title": mb_title,
            "character_id": parseInt(character_id),
            "character_look_link": character_look_link,
            "mb_content": mb_content,
            "mb_photo_link": mb_photo_link || null,
            "mb_image_link": mb_image_link || null,
            "mb_emotion": mb_emotion || null,
            "created_at": new Date(),
            "updated_at": new Date()
        };
        memory_ball_list.push(newMemoryBall);
        // 在這裡處理創建角色邏輯，例如驗證輸入、儲存資料庫等
        return successMessage(res, 201, 'Memory Ball is created successfully', newMemoryBall);
        // res.status(201).json({ message: 'Memory Ball created successfully' });
    } catch (error) {
        return errorMessage(res, 500, 'Memory Ball creation failed', error.message);
    }
}

async function getMemoryBallList (req, res) {
    try {
        // res.status(200).json({ message: 'Memory Ball list retrieved successfully' });
        return successMessage(res, 200, 'Memory Ball list retrieved successfully', memory_ball_list);
    } catch (error) {
        // res.status(500).json({ message: 'Memory Ball list retrieval failed', error: error.message });
        return errorMessage(res, 500, 'Memory Ball list retrieval failed', error.message);
    }  
}

async function getMemoryBall (req, res) {
    const memoryBallId = parseInt(req.params.id);
    try {
        const memoryBall = memory_ball_list.find(mb => mb.mb_id === memoryBallId);

        if (!memoryBall) {
            return errorMessage(res, 404, `Memory Ball with ID ${memoryBallId} not found`);
        }
        // res.status(200).json({ message: 'Memory Ball retrieved successfully' });
        return successMessage(res, 200, 'Memory Ball retrieved successfully', memoryBall);
    } catch (error) {
        return errorMessage(res, 500, 'Memory Ball retrieval failed', error.message);
    }
}

async function updateMemoryBall (req, res) {
    const { mb_title, character_id, character_look_link, mb_content, mb_photo_link, mb_image_link, mb_emotion } = req.body;

    if (!mb_title || !character_id || !character_look_link || !mb_image_link || !mb_emotion) {
        return errorMessage(res, 400, '創建 Memory Ball 失敗：缺少 mb_title, character_id, character_look_link 或 mb_content 必填欄位');
    }

    const memoryBallId = parseInt(req.params.id);

    const memoryBallIndex = memory_ball_list.findIndex(mb => mb.mb_id === memoryBallId);

    if (memoryBallIndex === -1) {
        return errorMessage(res, 404, `Memory Ball with ID ${memoryBallId} not found`);
    }
    
    try {
        if (mb_title) memory_ball_list[memoryBallIndex].mb_title = mb_title;
        if (character_look_link) memory_ball_list[memoryBallIndex].character_look_link = character_look_link;
        if (mb_content != undefined) memory_ball_list[memoryBallIndex].mb_content = mb_content;
        if (mb_image_link != undefined) memory_ball_list[memoryBallIndex].mb_image_link = mb_image_link;
        if (mb_photo_link != undefined) memory_ball_list[memoryBallIndex].mb_photo_link = mb_photo_link;
        if (mb_emotion != undefined) memory_ball_list[memoryBallIndex].mb_emotion = mb_emotion;
        memory_ball_list[memoryBallIndex].updated_at = new Date();
        return successMessage(res, 200, 'Memory Ball updated successfully', memory_ball_list[memoryBallIndex]);
    } catch (error) {
        // res.status(500).json({ message: 'Memory Ball update failed', error: error.message });
        return errorMessage(res, 500, 'Memory Ball update failed', error.message);
    }
}

async function deleteMemoryBall (req, res) {
    const memoryBallId = parseInt(req.params.id);

    const memoryBallIndex = memory_ball_list.findIndex(mb => mb.mb_id === memoryBallId);

    if (memoryBallIndex === -1) {
        return errorMessage(res, 404, `Memory Ball with ID ${memoryBallId} not found`);
    }
    try {
        memory_ball_list.splice(memoryBallIndex, 1);
        return successMessage(res, 200, 'Memory Ball deleted successfully');
    } catch (error) {
        return errorMessage(res, 500, 'Memory Ball deletion failed', error.message);
    }
}   

module.exports = {
    createMemoryBall,
    getMemoryBallList,
    getMemoryBall,
    updateMemoryBall,
    deleteMemoryBall
}