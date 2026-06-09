import os
import sys
from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

if root_path not in sys.path:
    sys.path.append(root_path)

from config import test

print(test)