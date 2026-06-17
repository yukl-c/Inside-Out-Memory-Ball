import os
import sys
from flask import Flask, render_template, request, jsonify
from google import genai
import google.genai as genai, types
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

if root_path not in sys.path:
    sys.path.append(root_path)

from config import api_key, client, model_name_gen_text

print(api_key)


def post_memory_ball_text(character_name, character_image_link, content, user_sketch_base64):

    # 2. 定義完整的 System Prompt (全部英文)
    system_prompt = """
   You are a detail-oriented psychological and visual analyst for a narrative game, renowned for your crystal-clear expression and profound understanding of human developmental psychology across all age groups. Your task is to evaluate a specific memory event (content) along with the character's visual appearance.

    In your analysis, you must adapt your psychological evaluation to the character's lifecycle stage, recognizing that emotional weights, facial micro-expressions, and behavioral responses manifest differently depending on whether the character is a child, adolescent, adult, or elder.

    You must output a JSON object containing three components:
    1. "title": A concise, evocative title summarized directly from the memory scene.
    2. "scene_prompt": A crystal-clear, highly detailed, natural language prompt that visualizes this memory. You must describe the character (matching the provided image, adapted to their specific age) inside a glowing, translucent spherical crystal memory orb (Memory Ball). Meticulously describe the precise action, environmental context, atmospheric lighting, and subtle facial expressions without using bullet points or tags.
    3. "emotions": A structured percentage mapping of the 5 core emotions (Joy, Sadness, Anger, Disgust, Fear) based on a deep psychological reading of the narrative content for that specific age group. The total sum of all 5 emotions must equal exactly 100.

    CRITICAL INSTRUCTIONS:
    - Be exceptionally detail-oriented: capture the fine textures of the environment and the nuance of the emotion.
    - Maintain utmost clarity: do not use ambiguous prose or generic placeholder phrases.
    - Output the result strictly in JSON format with no markdown wrappers (such as ```json).

    Output Format:
    {
    "title": "A Painful Wobble and Wounded Knee", 
    "scene_prompt": "Inside a
    translucent, glowing spherical memory orb, a young cub-like version of Yul,
    matching the distinct light blue mane, white fur, and red eyes from image_0.png
    but with softer, more rounded features, is depicted in a moment of distress. The
    memory shows him wearing a smaller, child-sized blue cloak trimmed in gold,
    similar to the one in image_0.png, but slightly askew and dusty. He is sitting
    directly on cracked, gray playground asphalt, clutching his right knee, where a
    tiny, visible red scrape shows through his white fur. His face is crumpled in
    genuine emotional and physical pain, wide red eyes streaming with tears and his
    mouth open mid-cry, showing small, sharp teeth. His small front paws are stained
    with dust from trying to catch himself. Just to his left, a bright red,
    classic-style children’s bicycle lies sideways, its front wheel slightly bent
    and still slowly turning, its pedals twisted. The background is a gently
    blurred, sunlit elementary school playground, with indistinct green metal
    equipment and yellow safety surface. The atmosphere within the orb is heavy with
    the warm, dusty light of late afternoon and the sharp sting of sudden pain and
    shock. The overall style is clear digital illustration, capturing the
    character’s specific look, scaled to a young age.", 
    "emotions": { "Joy": 5,
    "Sadness": 60, "Anger": 15, "Disgust": 0, "Fear": 20 } 
    }
    """

    # 3. 組合 User Prompt 欄位 (將表格資料轉化為結構化文字供模型閱讀)
    user_text_prompt = f"""
    Analyze the following structured character profile and create the expanded art prompt:
    - Character Name: {character_name}
    - Description/Backstory: {content}
    """

    # 4. 建構給 Gemini SDK 的 Part 列表 (動態加入圖片)
    # 預設先把文字放進去
    contents_parts = [
        types.Part.from_text(text=user_text_prompt),
        types.Part.from_bytes(
                data=character_image_link,
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
        # 5. 正式呼叫 Gemini API 2.5 Flash
        response = client.models.generate_content(
            model=model_name_gen_text,
            contents=contents_parts,
            config=types.GenerateContentConfig(
                # 關鍵：在這裡獨立傳入 System Prompt
                system_instruction=system_prompt,
                # 強制輸出格式為 JSON
                response_mime_type="application/json",
                temperature=1
            )
        )
        
        # 6. 解析 Gemini 回傳的 JSON 結構並返回給前端或直接塞入 API 2
        # response.text 會是：{"character_prompt": "..."}
        return jsonify({
            "status": "success",
            "data": response.text 
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500