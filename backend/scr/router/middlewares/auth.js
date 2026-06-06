const jwt = require('jsonwebtoken');
const errorMessage = require('../utils/status_messages').errorMessage;

const verifyToken = (req, res, next) => {
    // 1. 嘗試從各種地方抓取 Token (優先看 Header，次之看網址參數 query)
    let token = req.headers['authorization'] || req.query.token;

    // 如果前端是用標準的 "Bearer <Token>" 格式傳過來，我們把 "Bearer " 字串切掉
    if (token && token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }

    // 2. 檢查有沒有 Token
    if (!token) {
        return errorMessage(res, 401, "拒絕存取：未提供驗證 Token！");
    }

    try {
        // 3. 解密驗證 Token
        // 使用當時加密的同一個秘密金鑰進行驗證
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. 【核心關鍵】把解密出來的資料（包含 userId）掛在 req 物件上
        // 這樣後續的 Controller 就能直接透過 req.user.userId 拿到目前登入的是誰！
        req.user = decoded; 

        next(); // 通過驗證，放行前往下一站 (Controller)
    } catch (error) {
        // 如果 Token 過期或被竄改，會走到這裡
        return errorMessage(res, 403, "驗證失敗：Token 無效或已過期！");
    }
};

module.exports = verifyToken;