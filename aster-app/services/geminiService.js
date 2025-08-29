const GEMINI_API_KEY = 'AIzaSyDCXJpIYnPYiftAYxNfyWg_nMq5B7QGNQU'; // Replace with your actual API key
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function analyzeFood(base64Image) {
  try {
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

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
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