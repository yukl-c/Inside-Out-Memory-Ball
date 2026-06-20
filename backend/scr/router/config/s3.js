// config/s3.js (升級版)
const { S3Client, ListBucketsCommand, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const axios = require('axios');

const region = process.env.REGION;  
const accessKeyId = process.env.ACCESS_KEY; 
const secretAccessKey = process.env.SECRET_ACCESS_KEY; 
const s3Bucket = process.env.S3_BUCKET_NAME; 
console.log(`access key id : ${(accessKeyId)}`);
console.log(`secret access key : ${(secretAccessKey)}`)
console.log(`bucket name : ${(s3Bucket)}`);
console.log(`region : ${(region)}`);

const s3Client = new S3Client({
    region: region,
    credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
    },
});

// async function verifyBuckets() {
//   try {
//     // 2. Send a lightweight request to AWS
//     const command = new ListBucketsCommand({});
//     const response = await s3Client.send(command);
    
//     console.log("✅ S3 連線成功！");
//     console.log(`在此帳戶中找到 ${response.Buckets.length} 個儲存桶。`);
//   } catch (err) {
//     // console.error("❌ S3 連線失敗！原因：", err.message, err.$metadata?.httpStatusCode);
//     console.error(err);
//   }
// }

async function verifySpecificBucket(bucketName) {
  try {
    const command = new HeadBucketCommand({ Bucket: bucketName });
    await s3Client.send(command);
    console.log(`✅ 已成功連接到儲存桶： ${bucketName}`);
  } catch (err) {
    console.error(`❌ 連接到儲存桶失敗： ${bucketName}！原因：${err.message} ${err.$metadata?.httpStatusCode}`);
  }
}

// checkS3Connection();
verifySpecificBucket(s3Bucket);
// verifyBuckets();


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ➕ 萬用上傳大招
const uploadToS3 = async (file, folderName) => {
    const uniqueFileName = `${folderName}/${Date.now()}_${file.originalname}`;
    const params = {
        Bucket: s3Bucket,
        Key: uniqueFileName,
        Body: file.buffer,
        ContentType: file.mimetype
    };
    await s3Client.send(new PutObjectCommand(params));
    
    // 💡 關鍵：除了回傳網址，也把唯一的 Key 回傳，這樣刪除時才找得到檔案
    return {
        imageUrl: `https://${params.Bucket}.s3.${region}.amazonaws.com/${uniqueFileName}`,
        s3Key: uniqueFileName
    };
};

// ❌ 萬用刪除大招（當 RDS 失敗時，用來擦屁股的補償機制）
const deleteFromS3 = async (s3Key) => {
    try {
        const params = {
            Bucket: s3Bucket,
            Key: s3Key // 只要給它資料夾路徑與檔名（Key），它就能精準刪除
        };
        await s3Client.send(new DeleteObjectCommand(params));
        console.log(`🗑️ 【S3 補償機制成功】已自動擦除幽靈檔案: ${s3Key}`);
    } catch (delError) {
        // 如果連刪除都失敗，記錄嚴重錯誤日誌，以便人工後續排查
        console.error(`🚨 【S3 警告】自動擦除檔案 ${s3Key} 失敗:`, delError.message);
    }
};

// 📄 config/s3.js 內部的 uploadAiUrlToS3 區塊

const uploadAiUrlToS3 = async (aiImageUrl, folderName) => {
    try {
        console.log(`正在嘗試從網路下載 AI 圖片: ${aiImageUrl}`);

        // 📥 1. 用 axios 下載圖片，並加上【瀏覽器偽裝面具】Headers 
        const response = await axios.get(aiImageUrl, { 
            responseType: 'arraybuffer',
            headers: {
                // 💡 關鍵優化：加上這行，告訴對方伺服器「我是一個真實的 MacOS Chrome 瀏覽器」，破解 403 封鎖！
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        });
        
        const buffer = Buffer.from(response.data, 'binary');

        // 🔍 2. 從回應的 headers 抓取真實型態
        const contentType = response.headers['content-type'] || 'image/jpeg';
        const ext = contentType.split('/')[1] || 'jpg'; 

        // 🏷️ 3. 製造唯一的檔案名稱
        const uniqueFileName = `${folderName}/ai_${Date.now()}.${ext}`;
        
        const params = {
            Bucket: s3Bucket,
            Key: uniqueFileName,
            Body: buffer,          
            ContentType: contentType
        };

        // 🚀 4. 發送指令上傳到 AWS S3
        await s3Client.send(new PutObjectCommand(params));

        return {
            imageUrl: `https://${params.Bucket}.s3.${region}.amazonaws.com/${uniqueFileName}`,
            s3Key: uniqueFileName
        };
    } catch (error) {
        // 💡 印出更詳細的錯誤日誌，方便你 debug
        if (error.response) {
            console.error(`❌ 下載失敗！對方伺服器回應狀態碼: ${error.response.status}`);
        }
        console.error("🚨 【S3 轉存 AI 圖片失敗】:", error.message);
        throw new Error(`無法將 AI 圖片轉存至 S3: ${error.message}`);
    }
};

const uploadAiBase64ToS3 = async (aiImageBase64, folderName) => {
    try {
        console.log(`正在嘗試從base 64下載 AI 圖片: ${aiImageBase64}`);

        const matches = aiImageBase64.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        
        let type = "jpeg"; 
        let pureBase64String = aiImageBase64;

        if (matches) {
            // split from base64
            type = matches[1]; // image format
            pureBase64String = matches[2]; // base64 data
        } else {
            console.log("📝 偵測到純 Base64 格式，將使用預設 image/jpeg 格式儲存");
        }

        // 2. 💡 修正點：將純 Base64 字串轉化為記憶體中的二進位 Buffer
        const base64Buffer = Buffer.from(pureBase64String, 'base64');

        // 製造唯一的檔案名稱
        const uniqueFileName = `${folderName}/ai_${Date.now()}.${type}`;
        
        const params = {
            Bucket: s3Bucket,
            Key: uniqueFileName,
            Body: base64Buffer,          
            ContentType: `image/${type}`
        };

        // 🚀 4. 發送指令上傳到 AWS S3
        await s3Client.send(new PutObjectCommand(params));

        return {
            imageUrl: `https://${params.Bucket}.s3.${region}.amazonaws.com/${uniqueFileName}`,
            s3Key: uniqueFileName
        };
    } catch (error) {
        // 💡 印出更詳細的錯誤日誌，方便你 debug
        if (error.response) {
            console.error(`❌ 下載失敗！對方伺服器回應狀態碼: ${error.response.status}`);
        }
        console.error("🚨 【S3 轉存 AI 圖片失敗】:", error.message);
        throw new Error(`無法將 AI 圖片轉存至 S3: ${error.message}`);
    }
};


module.exports = { upload, uploadToS3, deleteFromS3, uploadAiUrlToS3, uploadAiBase64ToS3 };