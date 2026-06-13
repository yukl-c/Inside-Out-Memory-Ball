import os
import sys
import base64
from flask import Flask, request, jsonify
from google import genai
from google.genai import types # Corrected import structure

root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

if root_path not in sys.path:
    sys.path.append(root_path)

from config import api_key, client, model_name_gen_image

print(api_key)

# FIXED: Initialize the Flask app so @app.route works
app = Flask(__name__)

@app.route('/api/generate-memory-ball-image', methods=['POST'])
def generate_character_text():
    # 1. 接收前端 Form / Input Fields 的資料
    data = request.json

    title = data.get('title', 'unknown')
    scene_prompt = data.get('scene_prompt', '')
    emotions = data.get('emotion', {})
    character_image = data.get('character_image', None)
    user_sketch_base64 = data.get('user_sketch_base64', None) 

    # FIXED: Corrected indentation (4 spaces) to prevent IndentationError
    system_prompt = """
    You are an expert concept artist and psychological visualization engine. 
    Your primary goal is to bring human memories to life through clean, immersive, full-screen narrative scenes. 
    You must always ensure the character matching the provided reference image remains perfectly consistent in features, hair, and essence within the scene.
    The artwork must be beautiful and expressive, focusing strictly on realistic or stylized environment elements. Do not overlay any abstract emotional visual effects, magical energy, floating mist, or dark smoke on top of the scene.
    """

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

    # 4. 建構給 Gemini SDK 的 Part 列表
    contents_parts = [
        types.Part.from_text(text=user_text_prompt)
    ]
    
    # FIXED: Added a check for character_image and decoded the base64 string to bytes
    if character_image:
        contents_parts.append(
            types.Part.from_bytes(
                data=base64.b64decode(character_image),
                mime_type="image/png" 
            )
        )

    # FIXED: Decoded the base64 string to bytes
    if user_sketch_base64:
        contents_parts.append(
            types.Part.from_bytes(
                data=base64.b64decode(user_sketch_base64),
                mime_type="image/png"
            )
        )

    try:
        response = client.models.generate_content(
            model=model_name_gen_image,
            contents=contents_parts,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=1,
                aspect_ratio="16:9",
            )
        )

        image_bytes = response.candidates[0].content.parts[0].inline_data.data
        
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        image_data_uri = f"data:image/png;base64,{image_base64}"

        return jsonify({
            "status": "success",
            "character_looks_link": image_data_uri 
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# Optional: Add standard execution block for local testing
if __name__ == '__main__':
    app.run(port=5000, debug=True)