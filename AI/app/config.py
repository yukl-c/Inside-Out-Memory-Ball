import os
from dotenv import load_dotenv
import google.genai as genai

load_dotenv()

api_key = "AQ.Ab8RN6J-qIjg_Vz_0Pog_IbuDGlf_0Gg6xAe45HEgljq-Ak8Hg"
# os.getenv("API_KEY") # 'AQ.Ab8RN6Ikmpf452zTGRimjueB8RuFhc5d1vV58oGSDhnPzXoQNQ'

client = genai.Client(api_key= os.getenv("API_KEY"))

# Example usage for generating content
model_name_gen_text = 'gemini-2.5-flash'

model_name_gen_image = 'gemini-2.5-flash-image' # 'gemini-3.1-flash-image-preview'

# response = client.models.generate_content(
#     model='gemini-2.5-flash',
#     contents='Hello World',
# )
# print(response.text)

# Initialize the model (e.g., gemini-2.5-flash)
# model_for_content = genai.GenerativeModel('gemini-2.5-flash')

# model_for_image = genai.GenerativeModel('gemini-3.1-flash-image-preview')

# test = "test"

# print(api_key)