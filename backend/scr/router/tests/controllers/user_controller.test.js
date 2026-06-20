// 📄 tests/controllers/users_controller.test.js

// 1. 💡 關鍵：在引入 Controller 之前，先把資料庫連線 Mock 掉！
jest.mock('../../config/db', () => ({
    query: jest.fn()
}));

const db = require('../../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { register, login, getUser, updatePassword, deleteUser } = require('../../controllers/users_controller');

describe('👤 Users Controller 單元測試集', () => {
    let req, res;

    // 在每個測試案例執行前，初始化全新的 Mock req 和 res 物件
    beforeEach(() => {
        req = { body: {}, user: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks(); // 清除上一次的 Mock 呼叫紀錄
        process.env.JWT_SECRET = 'test_secret_key'; // 模擬環境變數
    });

    // ==========================================
    // ➕ 1. 用戶註冊測試
    // ==========================================
    describe('▶️ register() 測試', () => {
        it('🎯 成功註冊：輸入欄位完整且帳號未被註冊，應回傳 201 成功', async () => {
            req.body = { name: 'riley', password: '123', confirm_password: '123' };
            
            // 模擬資料庫：第一個 SELECT 查無此人，第二個 INSERT 回傳新用戶
            db.query
                .mockResolvedValueOnce({ rows: [] }) // checkSql 的結果
                .mockResolvedValueOnce({ rows: [{ user_id: 1, user_name: 'riley' }] }); // INSERT 的結果

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                message: '用戶建立成功'
            }));
        });

        it('🔒 食材安檢：當缺少必填欄位時，應立刻攔截並回傳 400', async () => {
            req.body = { name: 'riley', password: '123' }; // 漏掉 confirm_password

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'fail',
                message: expect.stringContaining('缺少 name，password 或 confirm password 欄位')
            }));
        });

        it('🔒 一致性安檢：當兩次密碼輸入不符時，應攔截並回傳 400', async () => {
            req.body = { name: 'riley', password: '123', confirm_password: '456' };

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: '用戶建立失敗：password 和 confirm password 欄位内容不一致'
            }));
        });
    });

    // ==========================================
    // 🔑 2. 用戶登入測試
    // ==========================================
    describe('▶️ login() 測試', () => {
        it('🎯 成功登入：密碼正確應發放 JWT Token 並回傳 200', async () => {
            req.body = { name: 'riley', password: '123' };
            const fakeHashedPassword = bcrypt.hashSync('123', 10);
            
            db.query.mockResolvedValueOnce({
                rows: [{ user_id: 99, user_name: 'riley', password: fakeHashedPassword }]
            });

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                message: '登入成功',
                statusCode: 200,
                data: expect.objectContaining({
                    userId: 99,
                    token: expect.any(String) // 驗證確實有生出 Token 字串
                })
            }));
        });

        it('🔒 安全安檢：輸入錯誤密碼時，應拒絕登入並回傳 400', async () => {
            req.body = { name: 'riley', password: 'wrong_password' };
            const fakeHashedPassword = bcrypt.hashSync('123', 10);
            
            db.query.mockResolvedValueOnce({
                rows: [{ user_id: 99, user_name: 'riley', password: fakeHashedPassword }]
            });

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: '登入失敗： 錯誤用戶密碼'
            }));
        });
    });

    // ==========================================
    // 🔍 3. 獲取特定用戶資料測試
    // ==========================================
    describe('▶️ getUser() 測試', () => {
        it('🎯 成功獲取：應成功回傳特定用戶資料，且絕對不能洩漏密碼（裸奔）', async () => {
            req.user = { userId: 7 }; // 模擬 JWT 解析出來的身份
            db.query.mockResolvedValueOnce({
                rows: [{ user_id: 7, user_name: 'riley', password: 'secret_hash', email: 'riley@insideout.com' }]
            });

            await getUser(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            // 🔒 確保回傳的物件裡面沒有 password 欄位
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: { user_id: 7, user_name: 'riley', email: 'riley@insideout.com' }
            }));
            expect(res.json).not.toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ password: 'secret_hash' })
            }));
        });
    });

    // ==========================================
    // ✏️ 4. 更新密碼測試
    // ==========================================
    describe('▶️ updatePassword() 測試', () => {
        it('🎯 成功更改密碼：舊密碼比對正確，應將新密碼雜湊加密並更新，回傳 200', async () => {
            req.user = { userId: 7 };
            req.body = { old_password: 'old123', new_password: 'new555', confirm_password: 'new555' };
            
            const oldHash = bcrypt.hashSync('old123', 10);
            db.query
                .mockResolvedValueOnce({ rows: [{ user_id: 7, password: oldHash }] }) // 撈出舊密碼鎖
                .mockResolvedValueOnce({ rows: [] }); // 執行 UPDATE

            await updatePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users SET password = $1'),
                expect.any(Array)
            );
        });
    });
});