import os
import sys
from flask import Flask, render_template, request, jsonify
from google import genai
import google.genai as genai
# app = Flask(__name__)
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

if root_path not in sys.path:
    sys.path.append(root_path)

from config import api_key, client, model_name_gen_text

# print(api_key)

def post_character_text(character_name, gender, species, style, description, user_sketch_base64):
    # 1. 接收前端 Form / Input Fields 的資料
    # 假設前端發送的是 JSON Map
    # data = request.json
    
    # character_name = data.get('character_name', 'Unknown')
    # gender = data.get('gender', 'Unknown')
    # species = data.get('species', 'Human')
    # style = data.get('style', 'Pixar')
    # description = data.get('description', '')
    # user_sketch_base64 = data.get('user_sketch_base64', None) # 格式需為純 Base64 字串，不含 data:image/jpeg;base64,

    # 2. 定義完整的 System Prompt (全部英文)
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
        genai.types.Part.from_text(text=user_text_prompt)
    ]
    
    # 如果用家有畫畫，將用家畫的圖片 (Base64) 作為第二個 Part 塞進去
    if user_sketch_base64:
        contents_parts.append(
            genai.types.Part.from_bytes(
                data=user_sketch_base64,
                mime_type="image/png" # 或是 image/jpeg
            )
        )

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
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500