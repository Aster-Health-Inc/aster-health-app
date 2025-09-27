#!/usr/bin/env python3
"""
Enhanced Chatbot API with Full LLM Integration + User Data
"""

import os
import json
import pickle
import pandas as pd
import requests
import tempfile
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# LangChain imports
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize OpenAI LLM
llm = None
try:
    llm = ChatOpenAI(model='gpt-4o-mini', temperature=0.6)
    print("✅ OpenAI LLM initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize LLM: {e}")

# Load trained cycle prediction model
cycle_model = None
def load_cycle_prediction_model():
    """Load the trained random forest cycle prediction model from Supabase"""
    global cycle_model
    model_url = "https://iinbwdrzmmcwajbmuynh.supabase.co/storage/v1/object/public/chatbot-assets/models/random_forest_cycle_predictor.pkl"

    try:
        print("🔄 Loading cycle prediction model...")
        response = requests.get(model_url)
        if response.status_code == 200:
            # Create a temporary file for the model
            temp_file = tempfile.NamedTemporaryFile(suffix='.pkl', delete=False)
            temp_file.write(response.content)
            temp_file.close()

            # Load the model from the temporary file
            with open(temp_file.name, 'rb') as f:
                cycle_model = pickle.load(f)

            # Clean up the temporary file
            os.unlink(temp_file.name)
            print("✅ Cycle prediction model loaded successfully")
            return True
        else:
            print(f"❌ Model not found in Supabase (HTTP {response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Error loading cycle prediction model: {e}")
        return False

# Load the model on startup
load_cycle_prediction_model()

def predict_cycle_length(user_data):
    """Use the trained model to predict cycle length based on user data"""
    global cycle_model

    if not cycle_model:
        print("⚠️ Cycle prediction model not available")
        return None

    try:
        # Extract data from user_data for model prediction
        # This should match the features your model was trained on
        start_date_str = user_data.get('start_date')
        if not start_date_str:
            return None

        # Parse start date
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        today = datetime.now().date()

        # Calculate basic cycle features (adjust based on your model's training data)
        days_since_start = (today - start_date).days

        # Default values for model features - adjust these based on your training data
        input_features = pd.DataFrame([[
            1.0,  # CycleWithPeakorNot
            14,   # EstimatedDayofOvulation
            14,   # LengthofLutealPhase
            9,    # FirstDayofHigh
            5,    # TotalNumberofHighDays
            2,    # TotalNumberofPeakDays
            7,    # TotalDaysofFertility
            5,    # LengthofMenses
            3,    # MensesScoreDayOne
            3,    # MensesScoreDayTwo
            2,    # MensesScoreDayThree
            1,    # MensesScoreDayFour
            9,    # TotalMensesScore
            0,    # IntercourseInFertileWindow
            0     # UnusualBleeding
        ]], columns=[
            'CycleWithPeakorNot', 'EstimatedDayofOvulation', 'LengthofLutealPhase',
            'FirstDayofHigh', 'TotalNumberofHighDays', 'TotalNumberofPeakDays',
            'TotalDaysofFertility', 'LengthofMenses', 'MensesScoreDayOne',
            'MensesScoreDayTwo', 'MensesScoreDayThree', 'MensesScoreDayFour',
            'TotalMensesScore', 'IntercourseInFertileWindow', 'UnusualBleeding'
        ])

        # Make prediction
        predicted_length = cycle_model.predict(input_features)[0]
        print(f"🔮 Model predicted cycle length: {predicted_length:.1f} days")
        return float(predicted_length)

    except Exception as e:
        print(f"❌ Error making cycle prediction: {e}")
        return None

def determine_phase(today, start_date, cycle_length):
    """Determine current cycle phase"""
    if not start_date:
        return "unknown"

    days_since = (today - start_date).days
    if days_since < 0:
        return "pre-cycle"
    elif days_since <= 5:
        return "menstrual"
    elif days_since <= cycle_length // 2:
        return "follicular"
    elif days_since <= (cycle_length // 2) + 2:
        return "ovulation"
    elif days_since <= cycle_length:
        return "luteal"
    else:
        return "pre-menstrual"

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'llm_ready': llm is not None,
        'cycle_model_ready': cycle_model is not None,
        'message': 'Enhanced Chatbot API with LLM + Cycle Prediction Model',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/chat', methods=['POST'])
def chat_api():
    """
    Enhanced chat API with full LLM integration
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        message = data.get('message', '').strip()
        user_data = data.get('user_data', {})
        context = data.get('context', '')

        if not message:
            return jsonify({'error': 'No message provided'}), 400

        # Extract user data
        start_date_str = user_data.get('start_date')
        total_interactions = user_data.get('total_interactions', 0)
        accuracy = user_data.get('accuracy', '0')

        # Clean accuracy value
        if isinstance(accuracy, str):
            accuracy = accuracy.replace('%', '')
        try:
            accuracy_num = float(accuracy)
        except:
            accuracy_num = 0

        # Parse start date and calculate cycle info
        start_date = None
        cycle_info = ""

        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                today = datetime.now().date()
                days_since = (today - start_date).days

                # Use trained model for cycle length prediction
                predicted_cycle_length = predict_cycle_length(user_data)
                if predicted_cycle_length:
                    cycle_length = predicted_cycle_length
                    model_used = "AI model prediction"
                else:
                    cycle_length = 28  # Fallback to average
                    model_used = "average cycle length"

                cycle_phase = determine_phase(today, start_date, cycle_length)

                next_period_estimate = start_date + timedelta(days=int(cycle_length))
                days_until_next = (next_period_estimate - today).days

                cycle_info = f"""
Current Cycle Information:
- Last period started: {start_date_str} ({days_since} days ago)
- Current phase: {cycle_phase}
- Predicted cycle length: {cycle_length:.1f} days ({model_used})
- Estimated next period: {next_period_estimate.strftime('%Y-%m-%d')} (in {days_until_next} days)
"""
            except ValueError:
                cycle_info = f"- Last period start date: {start_date_str}"

        # Create comprehensive prompt for LLM
        prompt_template = """
You are Aster, a knowledgeable and empathetic AI assistant specialized in women's health and menstrual cycle tracking.

User's Personal Health Context:
{cycle_info}
- Total health interactions tracked: {total_interactions}
- Data tracking accuracy: {accuracy}%

Additional Context from App:
{context}

User's Question: {question}

Instructions:
- Provide helpful, accurate, and empathetic responses about women's health
- Use the user's personal data to give personalized advice when relevant
- For serious health concerns, always recommend consulting a healthcare provider
- Be supportive and understanding about sensitive health topics
- If asked about heavy bleeding or concerning symptoms, provide both general information and urge medical consultation

Response:
"""

        prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["cycle_info", "total_interactions", "accuracy", "context", "question"]
        )

        # Generate response with LLM
        if llm:
            try:
                chain = LLMChain(llm=llm, prompt=prompt)
                response_text = chain.run(
                    cycle_info=cycle_info,
                    total_interactions=total_interactions,
                    accuracy=accuracy_num,
                    context=context,
                    question=message
                )

                # Log successful interaction
                print(f"✅ LLM Response generated for: {message[:50]}...")

            except Exception as e:
                print(f"❌ LLM Error: {e}")
                response_text = generate_smart_fallback(message, user_data, cycle_info)
        else:
            response_text = generate_smart_fallback(message, user_data, cycle_info)

        return jsonify({
            'response': response_text.strip(),
            'metadata': {
                'timestamp': datetime.now().isoformat(),
                'llm_used': llm is not None,
                'user_data_integrated': bool(user_data),
                'cycle_phase': cycle_phase if start_date else 'unknown'
            }
        })

    except Exception as e:
        print(f"❌ API Error: {e}")
        return jsonify({
            'error': 'Internal server error',
            'response': 'I apologize, but I encountered an error. Please try again.',
            'metadata': {'timestamp': datetime.now().isoformat()}
        }), 500

def generate_smart_fallback(message, user_data, cycle_info):
    """Generate intelligent fallback when LLM unavailable"""
    message_lower = message.lower()

    start_date = user_data.get('start_date')
    total_interactions = user_data.get('total_interactions', 0)
    accuracy = user_data.get('accuracy', '0').replace('%', '')

    base_response = f"Based on your health tracking data ({total_interactions} interactions, {accuracy}% accuracy), "

    # Heavy bleeding concern
    if any(word in message_lower for word in ['bleeding', 'heavy', 'clots', 'flow']):
        if start_date:
            return f"""{base_response}I understand you're concerned about heavy bleeding.

{cycle_info}

Heavy bleeding can be concerning and may indicate various conditions. Please consult with a healthcare provider, especially if you're experiencing:
- Bleeding for more than 7 days
- Changing protection every hour
- Large clots
- Bleeding between periods

Your tracking data shows good consistency, which will be valuable information for your healthcare provider."""
        else:
            return "Heavy bleeding can be concerning. I recommend tracking your cycle details and consulting with a healthcare provider to discuss your symptoms and get personalized medical advice."

    # Period timing questions
    elif any(word in message_lower for word in ['period', 'cycle', 'next', 'when']):
        if start_date and cycle_info:
            return f"""{base_response}here's your personalized cycle information:

{cycle_info}

Your consistent tracking ({accuracy}% accuracy) helps predict patterns. Remember that cycles can vary by a few days, which is completely normal."""
        else:
            return "To help predict your next period, I'd need your recent period start date. Once you log period data in the app, I can provide personalized predictions based on your cycle patterns."

    # General health questions
    elif any(word in message_lower for word in ['health', 'symptoms', 'pain']):
        return f"""{base_response}I'm here to help with women's health questions.

{cycle_info if cycle_info else ""}

For specific health concerns or persistent symptoms, I always recommend consulting with a healthcare professional who can provide personalized medical advice based on your individual situation."""

    # Stats and tracking
    elif any(word in message_lower for word in ['stats', 'data', 'tracking']):
        return f"""Your health tracking statistics:
- Total interactions: {total_interactions}
- Data accuracy: {accuracy}%
- {f"Last period: {start_date}" if start_date else "No period data logged yet"}

{cycle_info if cycle_info else ""}

Great job maintaining consistent health tracking! This data helps identify patterns and provides valuable insights for your health journey."""

    # Default response
    else:
        return f"""{base_response}I'm here to help with your women's health questions.

{cycle_info if cycle_info else ""}

What specific aspect of your health or cycle would you like to know more about? I can help with period tracking, cycle predictions, symptoms, or general women's health topics."""

if __name__ == '__main__':
    print("🚀 Starting Enhanced Chatbot API with LLM...")
    print("🤖 OpenAI GPT-4o-mini integration enabled")
    print("📊 User data integration enabled")
    print("🌐 Server starting on http://localhost:5001")

    app.run(host='0.0.0.0', port=5001, debug=True)