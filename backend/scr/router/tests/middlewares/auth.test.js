// 📄 tests/middlewares/auth.test.js

// 1. 💡 搶先 Mock 掉 jsonwebtoken 套件，不讓它去執行真實的解密
jest.mock('jsonwebtoken');

const jwt = require('jsonwebtoken');
const verifyToken = require('../../middlewares/auth'); // 💡 修正引入路徑與正確變數名稱

describe('🔒 Auth Middleware (verifyToken) 單元測試集', () => {
    let req, res, next;

    beforeEach(() => {
        // 每次測試前，初始化乾淨的 Express 請求、回應物件與下一站放行函式
        req = {
            headers: {},
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn(); // 模擬 Express 的 next()
        
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'my_secret_key'; // 設定測試用的全域金鑰環境變數
    });

    // ==========================================
    // 🎯 測試情境一：標準正確的 Token 通關流程
    // ==========================================
    it('🎯 成功放行：當 Header 提供標準有效 Bearer Token 時，應解析資料掛載至 req.user 並呼叫 next()', () => {
        // 模擬前端送進來的 Header
        req.headers['authorization'] = 'Bearer valid_riley_token';
        
        // 🎭 劇本設定：當執行 jwt.verify 時，假裝它解密大獲全勝，吐出 Riley 的 userId
        const mockDecodedPayload = { userId: 7, name: 'Riley' };
        jwt.verify.mockReturnValue(mockDecodedPayload);

        // 執行中介軟體
        verifyToken(req, res, next);

        // 🔒 核心斷言點檢
        expect(jwt.verify).toHaveBeenCalledWith('valid_riley_token', 'my_secret_key'); // 檢查切除 Bearer 後的純 Token
        expect(req.user).toEqual(mockDecodedPayload); // 💡 確保有把解密資料【核心關鍵】掛在 req.user 上
        expect(next).toHaveBeenCalled(); // 確保有成功放行前往下一站 (Controller)
        expect(res.status).not.toHaveBeenCalled(); // 確保沒有錯誤攔截
    });

    // ==========================================
    // 🎯 測試情境二：完全沒帶 Token 的攔截流程
    // ==========================================
    it('🔒 拒絕存取：當前端完全沒提供 Token 時，應攔截並回傳 401 錯誤', () => {
        // 讓 req.headers 和 req.query 都保持空值

        verifyToken(req, res, next);

        // 🔒 核心斷言點檢（嚴格對照你的 auth.js 錯誤訊息與狀態碼設定）
        expect(next).not.toHaveBeenCalled(); // ❌ 絕對不能放行！
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            status: 'fail',
            message: '拒絕存取：未提供驗證 Token！'
        }));
    });

    // ==========================================
    // 🎯 測試情境三：Token 遭到竄改或過期的攔截流程
    // ==========================================
    it('🚨 驗證失敗：當 Token 已過期或被駭客竄改，jwt.verify 噴錯時，應攔截並回傳 403 錯誤', () => {
        req.headers['authorization'] = 'Bearer expired_or_hacked_token';
        
        // 🎭 劇本設定：強迫 jwt.verify 執行時直接噴出錯誤（模擬過期或簽章無效）
        jwt.verify.mockImplementation(() => {
            throw new Error('Token expired');
        });

        verifyToken(req, res, next);

        // 🔒 核心斷言點檢
        expect(next).not.toHaveBeenCalled(); // ❌ 絕對不能放行！
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            status: 'fail',
            message: '驗證失敗：Token 無效或已過期！'
        }));
    });
});