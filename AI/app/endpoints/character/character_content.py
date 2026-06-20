import io
import os
import sys
import requests
from PIL import Image
from flask import Flask, render_template, request, jsonify
from google import genai

# app = Flask(__name__)
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

if root_path not in sys.path:
    sys.path.append(root_path)

from config import api_key, client, model_name_gen_text

# print(api_key)

def post_character_text(character_name, gender, species, style, description, image_file=None, user_sketch_url=None):

    system_prompt = """
    You are an expert AI Art Director and Prompt Engineer for character design. 
    Your task is to analyze the user's structured character data (gender, species, description) and the provided sketch image (if any).
    You must synthesize all provided details into a seamless, highly descriptive, natural language prompt optimized for advanced image generation models.

    CRITICAL INSTRUCTIONS:
    1. Do not use tags or comma-separated keywords. Write in fluid, vivid prose.
    2. Incorporate all details: emphasize their gender, species attributes, and personality traits from the description into physical appearance and clothing style.
    3. If a sketch image is provided, maintain its composition, core clothing shape, and posture while elevating it to professional artistic quality.
    4. Output the result strictly in JSON format with the key "character_prompt". Do not include any markdown formatting like ```json.

    OUTPUT format and example:
    {
        "character_prompt": "A majestic non-binary furry character, depicted as a proud white lion, stands gracefully on two feet, embodying the charming and stylized aesthetic of Pokemon art. Their luxurious, light-blue mane frames a noble face, highlighted by intensely vibrant red eyes that convey both power and kindness. Each digit is tipped with gleaming silver claws, adding a touch of elegance and strength. They are draped in a flowing navy cloak, its fabric gently billowing, suggesting a sense of mystery and adventure, perfectly rendered with clean lines and a friendly yet powerful presence characteristic of the Pokemon universe.",
    }
    """

    # 3. 組合 User Prompt 欄位 (將表格資料轉化為結構化文字供模型閱讀)
    user_text_prompt = f"""
    Analyze the following structured character profile and create the expanded art prompt:
    - Character Name: {character_name}
    - Gender: {gender}
    - Species: {species}
    - Style: {style}
    - Description/Backstory: {description}
    """

    # 4. 建構給 Gemini SDK 的 Part 列表 (動態加入圖片)
    # 預設先把文字放進去
    contents_parts = [
        # genai.types.Part.from_text(text=user_text_prompt)
        user_text_prompt
    ]

    if image_file:
        if isinstance(image_file, dict) and 'file' in image_file:
            print("🤖 Gemini 偵測到實體草圖輸入，正在解析 Buffer...")
            try:
                file_bytes = image_file['file'][1]
                img = Image.open(io.BytesIO(file_bytes))
                contents_parts.append(img)
            except Exception as img_err:
                print(f"❌ PIL 解析圖片失敗: {str(img_err)}")

    
    if user_sketch_url:
         if isinstance(user_sketch_url, str) and user_sketch_url.startswith('http'):
            print(f"🤖 Gemini 微服務偵測到 S3 圖片網址: {user_sketch_url}，正在非同步下載...")
            try:
                response = requests.get(user_sketch_url, stream=True)
                if response.status_code == 200:
                    img = Image.open(response.raw)
                    contents_parts.append(img)
            except Exception as net_err:
                print(f"❌ 從 S3 下載圖片交給 Gemini 失敗: {str(net_err)}")

    try:
        print("API: ", api_key)
        # 5. 正式呼叫 Gemini API 2.5 Flash
        # response = client.models.generate_content(
        #     model='gemini-2.5-flash',
        #     contents='Hello World',
        # )
        response = client.models.generate_content(
            model=model_name_gen_text,
            contents=contents_parts,
            config=genai.types.GenerateContentConfig(
                # 關鍵：在這裡獨立傳入 System Prompt
                system_instruction=system_prompt,
                # 強制輸出格式為 JSON
                response_mime_type="application/json",
                temperature=1
            )
        )
        
        # 6. 解析 Gemini 回傳的 JSON 結構並返回給前端或直接塞入 API 2
        # response.text 會是：{"character_prompt": "..."}
        if response.text:
            return jsonify({
                "status": "success",
                "data": response.text 
            })
        else: 
            return jsonify({
                "status": "error", 
                "message": "API 未回傳任何文字"
            })

    except Exception as e:
        print(f" Gemini SDK 執行期間崩潰: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500