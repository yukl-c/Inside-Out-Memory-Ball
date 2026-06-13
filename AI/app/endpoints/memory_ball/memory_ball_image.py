import os
import sys
import base64
from flask import Flask, render_template, request, jsonify
from google import genai
import google.genai as genai, types

root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

if root_path not in sys.path:
    sys.path.append(root_path)

from config import api_key, client, model_name_gen_image

print(api_key)

@app.route('/api/generate-memory-ball-image', methods=['POST'])
def generate_character_text():
    # 1. 接收前端 Form / Input Fields 的資料
    # 假設前端發送的是 JSON Map
    data = request.json

    # 給 Nano Banana 2 的系統特質約束 (System Prompt)
    # 重點在於確立「藝術風格」與「畫面邊界」
    title = data.get('title', 'unknown')
    scene_prompt = data.get('scene_prompt', '')
    emotions = data.get('emotion', {})
    character_image = data.get('character_image', None)
    user_sketch_base64 = data.get('user_sketch_base64', None) # 格式需為純 Base64 字串，不含 data:image/jpeg;base64,

    # 給 Nano Banana 2 的系統特質約束 (System Prompt)
    # 重點在於確立「藝術風格」與「畫面邊界」，直接呈現開放式場景
   system_prompt = """
    You are an expert concept artist and psychological visualization engine. 
    Your primary goal is to bring human memories to life through clean, immersive, full-screen narrative scenes. 
    You must always ensure the character matching the provided reference image remains perfectly consistent in features, hair, and essence within the scene.
    The artwork must be beautiful and expressive, focusing strictly on realistic or stylized environment elements. Do not overlay any abstract emotional visual effects, magical energy, floating mist, or dark smoke on top of the scene.
    """

    # 結合 API 3 成果與繪圖指令的 User Prompt
    user_text_prompt = f"""
    Render the following vivid memory scene as a clean, direct cinematic artwork:

    [Scene Title]:
    {title}

    [Memory Scene to Render]:
    {scene_prompt}

    [Instructions for the Environment and Atmosphere]:
    - Primary Subject: The character in the scene must be a perfect likeness of the reference image attached. Do not change their facial features, only their pose, clothing, and expression to match the scene above.
    - Visual Style: Render a clean and realistic/stylized scene directly. There must be NO surrounding crystal balls, NO transparent overlay layers, and NO abstract physical manifestations of emotions.
    - CRITICAL - NO EMOTIONAL SMOKE/MIST: Absolutely do NOT add any visible dark smoke, black mists, magical swirling gasses, or floating magical sparkles to represent emotions (Avoid effects like the black mist seen in the lower corners of 'Generated Image June 13, 2026 - 2_41PM.jpg'). The air must be completely clear and clean.
    - Natural Atmosphere & Lighting: Express the core emotions ({emotions}) strictly through natural environmental lighting, color temperature, and shadows. For example, if Sadness/Fear is high, use cold overcast daylight, heavy casting shadows, or muted realistic color palettes. If Joy is high, use warm, bright, clear sunlight.
    - If a reference sketch image is attached to this request, you MUST strictly adhere to its core composition and silhouette, elevating it to professional artistic quality.
    """

    # 4. 建構給 Gemini SDK 的 Part 列表 (動態加入圖片)
    # 預設先把文字放進去
    contents_parts = [
        types.Part.from_text(text=user_text_prompt),
        types.Part.from_bytes(
                data=character_image,
                mime_type="image/png" # 或是 image/jpeg
        )
    ]
    
    # 如果用家有畫畫，將用家畫的圖片 (Base64) 作為第二個 Part 塞進去
    if user_sketch_base64:
        contents_parts.append(
            types.Part.from_bytes(
                data=user_sketch_base64,
                mime_type="image/png" # 或是 image/jpeg
            )
        )

    try:
        # 呼叫 Nano Banana 2 製造圖片
        response = client.models.generate_content(
            model=model_name_gen_image,
            contents=contents_parts,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=1,
                aspect_ratio="16:9",
            )
        )

        # 🎯 正確提取 Nano Banana 2 生成的圖片位元組 (Bytes)
        # 圖片模型的影像資料直接藏在第一個 part 的 inline_data 中
        image_bytes = response.candidates[0].content.parts[0].inline_data.data
        
        # 將二進位圖片編碼為 Base64 字串，方便存入 DB (character_looks_link) 與回傳前端
        
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        image_data_uri = f"data:image/png;base64,{image_base64}"

        # 回傳標準結構化 JSON 供前端 `<img src="...">` 直接讀取顯示
        return jsonify({
            "status": "success",
            "character_looks_link": image_data_uri  # 這就是你需要的正面+背面 Base64 連結
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500