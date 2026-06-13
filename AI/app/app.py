from flask import Flask, request
from endpoints.character.character_content import post_character_text
from endpoints.character.character_looks import post_character_image

app = Flask(__name__)

@app.route('/api/generate-character-text', methods=['POST'])
def generate_character_text():
    data = request.json
    
    character_name = data.get('character_name', 'Unknown')
    gender = data.get('gender', 'Unknown')
    species = data.get('species', 'Human')
    style = data.get('style', 'Pixar')
    description = data.get('description', '')
    user_sketch_base64 = data.get('user_sketch_base64', None) # 格式需為純 Base64 字串，不含 data:image/jpeg;base64,

    return post_character_text(character_name, gender, species, style, description, user_sketch_base64)

@app.route('/api/generate-character-image', methods=['POST'])
def generate_character_image():
    data = request.json
    
    character_prompt = data.get('character_prompt', '')
    user_sketch_base64 = data.get('user_sketch_base64', None)

    return post_character_image(character_prompt, user_sketch_base64)


if __name__ == "__main__":
    app.run()