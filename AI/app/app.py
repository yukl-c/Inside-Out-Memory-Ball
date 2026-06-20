from flask import Flask, request, jsonify
from endpoints.character.character_content import post_character_text
from endpoints.character.character_looks import post_character_image
from endpoints.memory_ball.memory_ball_content import post_memory_ball_text
from endpoints.memory_ball.memory_ball_image import post_memory_ball_image

app = Flask(__name__)

# @app.route('/api/generate-character-text', methods=['POST'])
# def generate_character_text():
#     data = request.get_json(silent=True) or {}
    
#     character_name = data.get('character_name', 'Unknown')
#     gender = data.get('gender', 'Unknown')
#     species = data.get('species', 'Human')
#     style = data.get('style', 'Pixar')
#     description = data.get('description', '')
#     user_sketch_base64 = data.get('user_sketch_base64', None) # 格式需為純 Base64 字串，不含 data:image/jpeg;base64,
#     user_sketch_url = data.get('user_sketch_url', None)

#     return post_character_text(character_name, gender, species, style, description, user_sketch_base64, user_sketch_url)

@app.route('/api/generate-character-text', methods=['POST'])
def generate_character_text():
    requestForm = request.form

    character_name = requestForm.get('character_name', 'Unknown')
    gender = requestForm.get('gender', 'Unknown')
    species = requestForm.get('species', 'Human')
    style = requestForm.get('style', 'Pixar')
    description = requestForm.get('description', '')
    user_sketch_url = requestForm.get('user_sketch_url', None)

    image_files = None
    if 'file' in request.files:
        uploaded_file = request.files['file']
        if uploaded_file.filename == '':
            return jsonify({"error": "檔案名稱為空"}), 400

        file_bytes = uploaded_file.read()
        filename = uploaded_file.filename
        content_type = uploaded_file.content_type

        image_files = {
            'file': (filename, file_bytes, content_type)
        }

    return post_character_text(character_name, gender, species, style, description, image_files,user_sketch_url)


@app.route('/api/generate-character-image', methods=['POST'])
def generate_character_image():
    # data = request.get_json(silent=True) or {}
    
    # character_prompt = data.get('character_prompt', '')
    # user_sketch_base64 = data.get('user_sketch_base64', None)
    # user_sketch_url = data.get('user_sketch_url', None)

    requestForm = request.form

    character_prompt = requestForm.get('character_prompt', '')
    user_sketch_url = requestForm.get('user_sketch_url', None)

    image_files = None
    if 'file' in request.files:
        uploaded_file = request.files['file']
        if uploaded_file.filename == '':
            return jsonify({"error": "檔案名稱為空"}), 400
        file_bytes = uploaded_file.read()
        filename = uploaded_file.filename
        content_type = uploaded_file.content_type
        image_files = {
            'file': (filename, file_bytes, content_type)
        }

    return post_character_image(character_prompt, image_files, user_sketch_url)

@app.route('/api/generate-memory-ball-text', methods=['POST'])
def generate_memory_ball_text():
    data = request.get_json(silent=True) or {}
    
    character_name = data.get('character_name', 'Unknown')
    character_image_link = data.get('character_image', None)
    content = data.get('description', '')
    user_sketch_base64 = data.get('user_sketch_base64', None)   

    return post_memory_ball_text(character_name, character_image_link, content, user_sketch_base64)

@app.route('/api/generate-memory-ball-image', methods=['POST'])
def generate_memory_ball_image():
    # 1. 接收前端 Form / Input Fields 的資料
    data = request.get_json(silent=True) or {}

    title = data.get('title', 'unknown')
    scene_prompt = data.get('scene_prompt', '')
    emotions = data.get('emotion', {})
    character_image_link = data.get('character_image', None)
    user_sketch_base64 = data.get('user_sketch_base64', None) 

    return post_memory_ball_image(title, scene_prompt, emotions, character_image_link, user_sketch_base64)


if __name__ == "__main__":
    app.run(port=5000, debug=True)