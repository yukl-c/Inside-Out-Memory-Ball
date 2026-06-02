const db = require('../config/db');
const successMessage = require('../utils/status_messages').successMessage;
const errorMessage = require('../utils/status_messages').errorMessage;

// ➕ 1. 用戶註冊
async function register (req, res) {
    const { name, pwd, confirm_pwd } = req.body;

    // 🔒 400 食材安檢（記得加上 return 阻斷！）
    if (!name || !pwd || !confirm_pwd) {
        return errorMessage(res, 400, "用戶建立失敗：缺少 name，password 或 confirm password 欄位");
    }

    if (pwd !== confirm_pwd) {
        return errorMessage(res, 400, "用戶建立失敗：password 和 confirm password 欄位内容不一致");
    }

    try {
        // 檢查帳號是否重複
        const checkSql = `SELECT * FROM users WHERE user_name = $1`
        const checkParam = [name]
        const checkResult = await db.query(checkSql, checkParam);
        if (checkResult.rows.length > 0) {
            return errorMessage(res, 400, "用戶建立失敗：該用戶名稱已被註冊");
        }

        const sql = `INSERT INTO users (user_name, password)
                     VALUES ($1, $2)
                     RETURNING user_name, created_at, updated_at`;

        const params = [name, pwd];
        const result = await db.query(sql, params);

        return successMessage(res, 201, "用戶建立成功", result.rows[0]);
    } catch (error) {
        console.error("【資料庫註冊錯誤報告】:", error);
        return errorMessage(res, 500, `用戶建立失敗： ${error.message}`);
    }
}

// 🔑 2. 用戶登入
async function login (req, res) {
    const { name, pwd } = req.body;
    console.log(`name: ${name}, pwd: ${pwd}`);

    if (!name || !pwd) {
        return errorMessage(res, 400, "登入失敗： 缺少 name 或 password 欄位");
    }

    try {
        const loginSql = `SELECT * FROM users WHERE user_name = $1 AND password = $2`; 
        const loginParams = [name, pwd];
        const loginResult = await db.query(loginSql, loginParams);
        console.log(loginResult.rows)
        
        if (loginResult.rows.length > 0) {
            // 💡 第 5 小時會在這裡發放 Token。目前先回傳假 Token 供測試
            const exist_user = loginResult.rows[0]
            return successMessage(res, 200, "登入成功", { 
                userId: exist_user.user_id, 
                token: "mock-valid-token-for-testing" 
            });
        } else {
            return errorMessage(res, 400, "登入失敗： 錯誤用戶名稱或密碼");
        }
    } catch (error) {
        console.error("【資料庫註冊錯誤報告】:", error);
        return errorMessage(res, 500, `登入失敗： ${error.message}`);
    }
}

// 🔍 3. 獲取特定用戶資料 (配合修改後的 Route /users/:id)
async function getUser (req, res) {
    try {
        const userId = req.params.id;
        const userResult = await db.query('SELECT * FROM users where user_id = $1', [userId]); 

        if (userResult.rows.length == 0) {
            return errorMessage(res, 404, `找不到 ID 為 ${userId} 的用戶`);
        }

        const user = userResult.rows[0];

        // 安全起見，回傳資料時把密碼拔掉
        const { password, ...userWithoutPassword } = user;
        return successMessage(res, 200, '用戶資料獲取成功', userWithoutPassword);
    } catch (error) {
        console.error("【資料庫註冊錯誤報告】:", error);
        return errorMessage(res, 500, '用戶資料獲取失敗', error.message);
    }
}

// ❌ 4. 刪除用戶 (配合修改後的 Route /users/:id)
async function deleteUser (req, res) {
    try {
        const userId = req.params.id;
        const checkResult = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]); 

        if (checkResult.rows.length === 0) {
            return errorMessage(res, 404, `刪除失敗：找不到 ID 為 ${userId} 的用戶`);
        }

        const sql = `DELETE FROM users
              WHERE user_id = $1`;
        const param = [userId];
        const result = await db.query(sql, param);
        return successMessage(res, 200, `ID 為 ${userId} 的用戶已成功刪除`);
    } catch (error) {
        console.error("【資料庫註冊錯誤報告】:", error);
        return errorMessage(res, 500, '用戶刪除失敗', error.message);
    }
}

// ✏️ 5. 更新密碼
async function updatePassword (req, res) {
    const {old_pwd, new_pwd, confirm_pwd } = req.body; 
    const userId = req.params.id;
    console.log(`user id: ${userId}`);

    if (!old_pwd || !new_pwd || !confirm_pwd) {
        return errorMessage(res, 400, "用戶更改密碼失敗：缺少必要欄位");
    }

    if (new_pwd !== confirm_pwd) {
        return errorMessage(res, 400, "用戶更改密碼失敗：新密碼與確認密碼不一致");
    }

    try {
        const checkResult = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]); 

        if (checkResult.rows.length === 0) {
            return errorMessage(res, 404, `找不到 ID 為 ${userId} 的用戶`);
        }
        
        if (checkResult.rows[0].password != old_pwd) {
            return errorMessage(res, 404, `舊密碼錯誤`)
        }

        const updatePwdSQL = `UPDATE users
                     SET password = $1
                     WHERE user_id = $2`;
                    
        const updatePwdParams = [new_pwd, userId];
        const updatePwdResult = await db.query(updatePwdSQL, updatePwdParams);             
        return successMessage(res, 200, "用戶更改密碼成功");
    } catch (error) {
        console.error("【資料庫註冊錯誤報告】:", error);
        return errorMessage(res, 500, `用戶更改密碼失敗： ${error.message}`);
    }
}

module.exports = {
    register,
    login,
    getUser,
    deleteUser,
    updatePassword
};