// Open Food Facts API service for barcode scanning
import { isUserDataSharingConsentGranted } from '../utils/userDataSharingConsent';

const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v0/product';

export async function getProductByBarcode(barcode) {
  try {
    const consentGranted = await isUserDataSharingConsentGranted();
    if (!consentGranted) {
      throw new Error(
        'Third-party data processing is disabled. Enable Data & AI Processing in Settings to continue.',
      );
    }

    console.log('Fetching product data for barcode:', barcode);
    
    const response = await fetch(`${OPEN_FOOD_FACTS_API}/${barcode}.json`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 0) {
      throw new Error('Product not found in Open Food Facts database');
    }
    
    const product = data.product;
    
    // Extract nutrition information (per 100g)
    const nutriments = product.nutriments || {};
    
    // Convert to our app's format
    const nutritionData = {
      food_name: product.product_name || product.product_name_en || 'Unknown Product',
      description: product.brands ? `${product.brands} - ${product.product_name || ''}` : (product.product_name || ''),
      calories: Math.round(nutriments.energy_kcal_100g || nutriments['energy-kcal_100g'] || 0),
      protein: `${Math.round(nutriments.proteins_100g || nutriments['proteins_100g'] || 0)}g`,
      carbohydrates: `${Math.round(nutriments.carbohydrates_100g || nutriments['carbohydrates_100g'] || 0)}g`,
      fat: `${Math.round(nutriments.fat_100g || nutriments['fat_100g'] || 0)}g`,
      serving_info: {
        type: determineServingType(product.categories || ''),
        servings: product.serving_size || '100g',
        weight: product.serving_size || '100g'
      },
      ingredients: extractIngredients(product.ingredients_text),
      micronutrients: extractMicronutrients(nutriments),
      // Additional data from Open Food Facts
      barcode: barcode,
      brands: product.brands,
      categories: product.categories,
      image_url: product.image_front_url || product.image_url,
      source: 'Open Food Facts'
    };
    
    console.log('Successfully parsed product data:', nutritionData);
    return nutritionData;
    
  } catch (error) {
    console.error('Error fetching product data:', error);
    throw new Error(`Failed to fetch product information: ${error.message}`);
  }
}

// Helper function to determine serving type based on categories
function determineServingType(categories) {
  const categoryLower = categories.toLowerCase();
  
  if (categoryLower.includes('breakfast') || categoryLower.includes('cereal')) {
    return 'Breakfast';
  } else if (categoryLower.includes('snack') || categoryLower.includes('candy') || categoryLower.includes('chocolate')) {
    return 'Snack';
  } else if (categoryLower.includes('beverages') || categoryLower.includes('drinks')) {
    return 'Snack';
  } else {
    // Default to lunch for most packaged foods
    return 'Lunch';
  }
}

// Helper function to extract ingredients
function extractIngredients(ingredientsText) {
  if (!ingredientsText) {
    return [{ name: 'Ingredients not available', amount: '' }];
  }
  
  // Simple parsing - split by comma and take first few
  const ingredients = ingredientsText
    .split(',')
    .slice(0, 5) // Limit to first 5 ingredients
    .map((ingredient, index) => ({
      name: ingredient.trim(),
      amount: '' // Open Food Facts doesn't provide individual amounts
    }));
    
  return ingredients.length > 0 ? ingredients : [{ name: 'Ingredients not available', amount: '' }];
}

// Helper function to extract micronutrients
function extractMicronutrients(nutriments) {
  const micronutrients = {};
  
  // Check for common micronutrients
  if (nutriments.fiber_100g || nutriments['fiber_100g']) {
    micronutrients.fiber = `${Math.round(nutriments.fiber_100g || nutriments['fiber_100g'])} g`;
  }
  
  if (nutriments.sugars_100g || nutriments['sugars_100g']) {
    micronutrients.sugars = `${Math.round(nutriments.sugars_100g || nutriments['sugars_100g'])} g`;
  }
  
  if (nutriments.salt_100g || nutriments['salt_100g']) {
    micronutrients.sodium = `${Math.round((nutriments.salt_100g || nutriments['salt_100g']) * 1000)} mg`;
  }
  
  if (nutriments['vitamin-c_100g']) {
    micronutrients.vitamin_c = `${Math.round(nutriments['vitamin-c_100g'])} mg`;
  }
  
  // If no micronutrients found, provide default
  if (Object.keys(micronutrients).length === 0) {
    micronutrients.fiber = '0.00 g';
    micronutrients.sugars = '0.00 g';
    micronutrients.sodium = '0.00 mg';
  }
  
  return micronutrients;
}

// Function to validate barcode format
export function isValidBarcode(barcode) {
  // Most common barcode formats are 8, 12, 13, or 14 digits
  return /^\d{8,14}$/.test(barcode);
}
