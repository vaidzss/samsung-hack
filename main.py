# main.py
# To run this backend, save it as `main.py` and run the command:
# uvicorn main:app --reload
# Ensure you have all dependencies installed:
# pip install fastapi uvicorn python-multipart Pillow pandas torch transformers sentencepiece word2number thefuzz

import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from PIL import Image
import pandas as pd
import warnings
import os
import torch
import re
import json
import io
from datetime import datetime, date, timedelta
from typing import Optional, List
from word2number import w2n
from thefuzz import process as fuzzy_process


# Import transformers if available
try:
    from transformers import pipeline, ViTForImageClassification, ViTImageProcessor
except ImportError:
    print("WARNING: `transformers` library not found. AI features will not work.")
    ViTForImageClassification = ViTImageProcessor = pipeline = None

# --- Suppress Warnings ---
warnings.filterwarnings("ignore")

# --- 1. Configuration ---
BASE_VIT_MODEL = "google/vit-base-patch16-224"
FINETUNED_VIT_PATH = "./finetuned" 
NUTRITION_DATA_PATH = './ULTIMATE_NUTRITION_DATABASE.csv'
TINYLLAMA_MODEL = "./text-model"
MEAL_LOG_FILE = "meal_log.json"
FEEDBACK_LOG_FILE = "feedback_log.json"

# --- 2. Initialize FastAPI App & AI Models ---
app = FastAPI(title="NutriGuide API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

class AIModels:
    def __init__(self):
        self.vit_classifier = None
        self.nutrition_df = None
        self.text_generator = None
        self.food_list_for_fuzzy_search = []
        self.load_models()

    def load_models(self):
        if pipeline and os.path.isdir(FINETUNED_VIT_PATH):
            try:
                processor = ViTImageProcessor.from_pretrained(FINETUNED_VIT_PATH)
                model = ViTForImageClassification.from_pretrained(FINETUNED_VIT_PATH)
                self.vit_classifier = pipeline(task="image-classification", model=model, image_processor=processor)
                print("✅ ViT model loaded successfully.")
            except Exception as e:
                print(f"⚠️ WARNING: Could not load ViT model. Error: {e}")
        else:
            print(f"⚠️ WARNING: ViT model directory not found at '{FINETUNED_VIT_PATH}'.")

        try:
            self.nutrition_df = pd.read_csv(NUTRITION_DATA_PATH)
            self.nutrition_df['Food_Item_Lower'] = self.nutrition_df['Food_Item'].str.lower().str.strip()
            nutritional_cols = ['Calories', 'Protein_g', 'Fat_g', 'Carbs_g']
            for col in nutritional_cols:
                self.nutrition_df[col] = pd.to_numeric(self.nutrition_df[col], errors='coerce')
            self.nutrition_df.dropna(subset=nutritional_cols, inplace=True)
            self.food_list_for_fuzzy_search = self.nutrition_df['Food_Item_Lower'].tolist()
            print("✅ Nutrition database loaded successfully.")
        except FileNotFoundError:
            print(f"❌ FATAL ERROR: Nutrition database not found at '{NUTRITION_DATA_PATH}'.")

        if pipeline and os.path.isdir(TINYLLAMA_MODEL):
            try:
                device_map = "auto" if torch.cuda.is_available() else "cpu"
                torch_dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32
                self.text_generator = pipeline("text-generation", model=TINYLLAMA_MODEL, torch_dtype=torch_dtype, device_map=device_map)
                print(f"✅ TinyLlama model loaded successfully from: {TINYLLAMA_MODEL}")
            except Exception as e:
                print(f"❌ FATAL ERROR: Could not load TinyLlama model. Details: {e}")
        else:
            print(f"⚠️ WARNING: Fine-tuned text model not found at '{TINYLLAMA_MODEL}'.")


ai = AIModels()

# --- 4. Helper Functions ---
def find_food_in_db_fuzzy(food_name: str, threshold=85):
    """Performs a fuzzy search with a configurable threshold."""
    if ai.nutrition_df is None or not food_name: return None
    
    normalized_name = food_name.lower().strip().replace('_', ' ')
    best_match, score = fuzzy_process.extractOne(normalized_name, ai.food_list_for_fuzzy_search)
    
    if score >= threshold:
        food_data = ai.nutrition_df[ai.nutrition_df['Food_Item_Lower'] == best_match].iloc[0]
        return food_data
    return None

def get_log(file_path):
    try:
        with open(file_path, 'r') as f: return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError): return []

def save_log(file_path, entry):
    log = get_log(file_path)
    log.append(entry)
    with open(file_path, 'w') as f: json.dump(log, f, indent=4)

# --- 5. Pydantic Models ---
class AskAIRequest(BaseModel): prompt: str
class FeedbackRequest(BaseModel):
    original_guess: str
    user_correction: str
    image_filename: Optional[str] = None
class SuggestionRequest(BaseModel):
    food_name: str
class LogMealRequest(BaseModel):
    user_profile: dict
    quick_check: bool
    meal_items: List[dict]
    image_food_name: Optional[str] = "Your Meal"


# --- 6. API Endpoints ---
@app.get("/get_daily_tip")
async def get_daily_tip_endpoint():
    if not ai.text_generator: return {"tip": "Welcome!"}
    prompt = "<|system|>You are a friendly health assistant. Provide a single, actionable, positive health tip. Keep it short.</s><|user|>Give me a simple health tip for today.</s><|assistant|>"
    sequences = ai.text_generator(prompt, max_new_tokens=70, do_sample=True, temperature=0.8)
    tip = sequences[0]['generated_text'].split("<|assistant|>")[1].strip()
    return {"tip": tip}

@app.post("/analyze_image")
async def analyze_image_endpoint(image: UploadFile = File(...)):
    if not ai.vit_classifier:
        raise HTTPException(status_code=503, detail="Image analysis model is not available.")
    try:
        img = Image.open(image.file)
        predictions = ai.vit_classifier(img)
        food_name = predictions[0]['label'].replace('_', ' ')
        return {"food_name": food_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze image: {e}")


@app.post("/suggest")
async def suggest_food_endpoint(request: SuggestionRequest):
    if ai.nutrition_df is None or not request.food_name:
        raise HTTPException(status_code=400, detail="Food name is required.")
    
    suggestions = fuzzy_process.extract(request.food_name.lower(), ai.food_list_for_fuzzy_search, limit=4)
    high_confidence_suggestions = [s[0] for s in suggestions if s[1] >= 75]
    
    return {"suggestions": high_confidence_suggestions}

@app.post("/log_meal")
async def log_meal_endpoint(request: LogMealRequest):
    total_calories, total_protein, total_fat, total_carbs = 0, 0, 0, 0
    
    for item in request.meal_items:
        food_name = item.get("item")
        quantity = float(item.get("quantity", 1))
        
        result = ai.nutrition_df[ai.nutrition_df['Food_Item_Lower'] == food_name.lower()]
        if not result.empty:
            food_data = result.iloc[0]
            total_calories += food_data['Calories'] * quantity
            total_protein += food_data['Protein_g'] * quantity
            total_fat += food_data['Fat_g'] * quantity
            total_carbs += food_data['Carbs_g'] * quantity
    
    advice = f"Logged {len(request.meal_items)} items for a total of {total_calories:.0f} calories. Well done!"

    if not request.quick_check:
        save_log(MEAL_LOG_FILE, {
            "timestamp": datetime.now().isoformat(), "food_name": request.image_food_name,
            "total_calories": total_calories, "total_protein": total_protein,
            "total_fat": total_fat, "total_carbs": total_carbs, "advice": advice
        })

    return {
        "food_name": request.image_food_name,
        "total_calories": total_calories, "total_protein": total_protein,
        "total_fat": total_fat, "total_carbs": total_carbs, "advice": advice,
        "meal_breakdown": request.meal_items
    }


@app.get("/get_meal_history")
async def get_meal_history_endpoint():
    return get_log(MEAL_LOG_FILE)

@app.post("/get_ai_summary")
async def get_ai_summary_endpoint(request: AskAIRequest):
    if not ai.text_generator:
        raise HTTPException(status_code=503, detail="AI Assistant is currently unavailable.")
    meal_history = get_log(MEAL_LOG_FILE)
    if not meal_history:
        return {"answer": "Your meal history is empty. Log a few meals to get a summary!"}
    history_context = "\n".join([f"- {datetime.fromisoformat(m['timestamp']).strftime('%Y-%m-%d')}: {m['food_name']} ({m.get('total_calories', 0):.0f} kcal)" for m in meal_history[-30:]])
    prompt_template = f"""
    <|system|>
    You are NutriGuide, a friendly AI nutritionist. Analyze the user's meal history and provide a helpful summary. Look for patterns, provide at least two clear, actionable suggestions. Be positive and conversational. Speak directly to the user.</s>
    <|user|>
    My recent meal history:
    {history_context}
    Please give me a summary of my diet and some suggestions. My original prompt was: "{request.prompt}"</s>
    <|assistant|>
    """
    sequences = ai.text_generator(prompt_template, max_new_tokens=500, do_sample=True, temperature=0.75)
    answer = sequences[0]['generated_text'].split("<|assistant|>")[1].strip()
    return {"answer": answer}

@app.post("/log_feedback")
async def log_feedback_endpoint(feedback: FeedbackRequest):
    save_log(FEEDBACK_LOG_FILE, {
        "timestamp": datetime.now().isoformat(),
        "original_guess": feedback.original_guess,
        "user_correction": feedback.user_correction,
        "image_filename": feedback.image_filename
    })
    return {"message": "Thank you for your feedback!"}

@app.get("/export_history")
async def export_history_endpoint():
    meal_history = get_log(MEAL_LOG_FILE)
    if not meal_history:
        raise HTTPException(status_code=404, detail="No meal history available.")
    df = pd.DataFrame(meal_history)
    expected_cols = ['timestamp', 'food_name', 'quantity', 'total_calories', 'total_protein', 'total_fat', 'total_carbs', 'advice']
    for col in expected_cols:
        if col not in df.columns: df[col] = 'N/A'
    df = df[expected_cols] 
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=nutriguide_history_{datetime.now().strftime('%Y-%m-%d')}.csv"
    return response

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
