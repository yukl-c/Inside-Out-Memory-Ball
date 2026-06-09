import os
from flask import Flask, render_template, request, jsonify
import google.generativeai as genai