import io
import os
import sys
import requests
from PIL import Image
from flask import Flask, render_template, request, jsonify
from google import genai
import base64
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

if root_path not in sys.path:
    sys.path.append(root_path)

from config import api_key, client, model_name_gen_image

def post_character_image(character_prompt, image_file=None, user_sketch_url=None):

    # 這是給 Nano Banana 2 的系統視覺特質約束 (System Prompt)
    system_prompt = """
    You are an advanced character design engine and cinematic concept artist. 
    Your primary goal is to translate detailed prose character descriptions and visual reference sketches into high-fidelity, consistent character sheets with front and back only. 
    You must always deliver clean, professional-grade concept art with sharp details, anatomically correct proportions, and uniform studio lighting. 
    Avoid showing the character's name, cluttered backgrounds, abstract artifact shapes, or floating watermarks.
    """

    # 這是結合 API 1 成果與繪圖指令的 User Prompt
    user_text_prompt = f"""
    Create a professional full-body turnaround character concept sheet based on the following details:
    
    [Core Character Attributes]:
    - Character prompt: {character_prompt}
    - User sketch URL (if any): {user_sketch_url}
    
    [Required Layout Structure]:
    - Present the EXACT SAME character in two distinct full-body views split side-by-side within a single landscape image.
    - Left side: Pure front view, standing in a neutral pose or light T-pose, facing forward.
    - Right side: Pure back view, revealing all clothing and armor details from behind.
    - Presentation: Clean, solid neutral light-gray studio background. Sharp focus, high contrast, optimal for 3D character modeling reference.
    - If a reference sketch image is attached to this request, you MUST strictly adhere to its core silhouette, clothing structure, and baseline composition while enhancing it into a finished, polished masterpiece.
    """

    contents_parts = [
        user_text_prompt
        # genai.types.Part.from_text(text=user_text_prompt)
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
        # 呼叫 Nano Banana 2 製造圖片
        response = client.models.generate_content(
            model=model_name_gen_image,
            contents=contents_parts,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=1,
                image_config=genai.types.ImageConfig(aspect_ratio="16:9")
            )
        )

        # 🎯 正確提取 Nano Banana 2 生成的圖片位元組 (Bytes)
        # 圖片模型的影像資料直接藏在第一個 part 的 inline_data 中
        image_bytes = response.candidates[0].content.parts[0].inline_data.data
        
        # 將二進位圖片編碼為 Base64 字串，方便存入 DB (character_looks_link) 與回傳前端
        
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        image_data_uri = f"data:image/png;base64,{image_base64}"

        print("image in base64:", image_base64)

        # 回傳標準結構化 JSON 供前端 `<img src="...">` 直接讀取顯示
        return jsonify({
            "status": "success",
            # "character_looks_link": image_data_uri  # 這就是你需要的正面+背面 Base64 連結
            "character_looks_base64": image_base64  # 這就是你需要的正面+背面 Base64
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500