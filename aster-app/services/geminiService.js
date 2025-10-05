import Constants from 'expo-constants';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || 'AIzaSyA74k2BfdJY5n_q_30T1w6_k1hQ0-EPtPk';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

export async function analyzeFood(base64Image) {
  try {
    console.log('Starting food analysis...');
    console.log('API Key (first 10 chars):', GEMINI_API_KEY.substring(0, 10));
    console.log('API URL:', GEMINI_API_URL.substring(0, 100));

    const prompt = `Analyze this food image and return ONLY a JSON object with the following structure. Do not include any other text or explanations:

{
  "food_name": "Name of the food item",
  "description": "Brief description of the food",
  "calories": 0,
  "protein": "0g",
  "carbohydrates": "0g",
  "fat": "0g",
  "serving_info": {
    "type": "Dinner/Lunch/Breakfast/Snack",
    "servings": "1 serving",
    "weight": "0g"
  },
  "ingredients": [
    {"name": "Ingredient 1", "amount": "0g"},
    {"name": "Ingredient 2", "amount": "0g"}
  ],
  "micronutrients": {
    "vitamin_d": "0.00 mg",
    "omega_3": "0.00 mg",
    "iron": "0.00 mg"
  }
}

Provide realistic nutritional estimates based on typical serving sizes for the food shown.`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }
      ]
    };

    console.log('Sending request to Gemini API...');
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('Received response from Gemini API');
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from the response (in case there's extra text)
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const nutritionData = JSON.parse(jsonMatch[0]);
    return nutritionData;

  } catch (error) {
    console.error('Error analyzing food:', error);
    throw new Error('Failed to analyze food. Please try again.');
  }
}