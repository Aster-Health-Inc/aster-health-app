import { supabase } from '../lib/supabase';

/**
 * Utility functions for accessing files from Supabase Storage
 */

/**
 * Download a file from Supabase storage bucket
 * @param {string} bucketName - Name of the storage bucket
 * @param {string} filePath - Path to the file in the bucket
 * @returns {Promise<{data: Blob, error: Error}>} 
 */
export const downloadFile = async (bucketName, filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(filePath);
    
    if (error) {
      console.error('Error downloading file:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Exception downloading file:', err);
    return { data: null, error: err };
  }
};

/**
 * Get public URL for a file in Supabase storage
 * @param {string} bucketName - Name of the storage bucket
 * @param {string} filePath - Path to the file in the bucket
 * @returns {string} Public URL of the file
 */
export const getPublicUrl = (bucketName, filePath) => {
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};

/**
 * Download and read text file content from Supabase storage
 * @param {string} bucketName - Name of the storage bucket
 * @param {string} filePath - Path to the text file in the bucket
 * @returns {Promise<{content: string, error: Error}>}
 */
export const downloadTextFile = async (bucketName, filePath) => {
  try {
    const { data, error } = await downloadFile(bucketName, filePath);
    
    if (error || !data) {
      return { content: null, error: error || new Error('No data received') };
    }
    
    const text = await data.text();
    return { content: text, error: null };
  } catch (err) {
    console.error('Error reading text file:', err);
    return { content: null, error: err };
  }
};

/**
 * Download and read JSON file content from Supabase storage
 * @param {string} bucketName - Name of the storage bucket
 * @param {string} filePath - Path to the JSON file in the bucket
 * @returns {Promise<{content: Object, error: Error}>}
 */
export const downloadJsonFile = async (bucketName, filePath) => {
  try {
    const { content, error } = await downloadTextFile(bucketName, filePath);
    
    if (error || !content) {
      return { content: null, error: error || new Error('No content received') };
    }
    
    const jsonData = JSON.parse(content);
    return { content: jsonData, error: null };
  } catch (err) {
    console.error('Error parsing JSON file:', err);
    return { content: null, error: err };
  }
};

/**
 * List all files in a storage bucket folder
 * @param {string} bucketName - Name of the storage bucket
 * @param {string} folderPath - Path to the folder (optional)
 * @returns {Promise<{files: Array, error: Error}>}
 */
export const listFiles = async (bucketName, folderPath = '') => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folderPath);
    
    if (error) {
      console.error('Error listing files:', error);
      return { files: [], error };
    }
    
    return { files: data, error: null };
  } catch (err) {
    console.error('Exception listing files:', err);
    return { files: [], error: err };
  }
};

/**
 * Upload a file to Supabase storage
 * @param {string} bucketName - Name of the storage bucket
 * @param {string} filePath - Path where to store the file in the bucket
 * @param {File|Blob} file - File to upload
 * @param {Object} options - Upload options (contentType, cacheControl, etc.)
 * @returns {Promise<{data: Object, error: Error}>}
 */
export const uploadFile = async (bucketName, filePath, file, options = {}) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        ...options
      });
    
    if (error) {
      console.error('Error uploading file:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Exception uploading file:', err);
    return { data: null, error: err };
  }
};

/**
 * Delete a file from Supabase storage
 * @param {string} bucketName - Name of the storage bucket
 * @param {string} filePath - Path to the file in the bucket
 * @returns {Promise<{success: boolean, error: Error}>}
 */
export const deleteFile = async (bucketName, filePath) => {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting file:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (err) {
    console.error('Exception deleting file:', err);
    return { success: false, error: err };
  }
};

// Specific functions for your use case
/**
 * Download context documents for mood prediction
 * @returns {Promise<{documents: Object, error: Error}>}
 */
export const downloadMoodContextDocuments = async () => {
  const bucketName = 'context-documents'; // Update this to match your bucket name
  const documents = {};
  
  try {
    // List of context documents to download
    const documentFiles = [
      'mood_and_hormones.txt',
      'physical_effects.txt'
    ];
    
    const pdfFiles = [
      'Mood_Swing_during_Menstruation.pdf',
      'Psychiatric_Symptoms_Across_the_Menstrual_Cycle_in_Adult_Women.pdf',
      'window_of_vulnerability.pdf'
    ];
    
    // Download text files
    for (const file of documentFiles) {
      const { content, error } = await downloadTextFile(bucketName, file);
      if (error) {
        console.error(`Error downloading ${file}:`, error);
        continue;
      }
      documents[file] = content;
    }
    
    // Get public URLs for PDF files
    for (const file of pdfFiles) {
      documents[file] = getPublicUrl(bucketName, file);
    }
    
    return { documents, error: null };
  } catch (err) {
    console.error('Error downloading mood context documents:', err);
    return { documents: {}, error: err };
  }
};

/**
 * Download cycle prediction model
 * @returns {Promise<{modelData: Blob, error: Error}>}
 */
export const downloadCyclePredictionModel = async () => {
  const bucketName = 'models'; // Update this to match your bucket name
  const modelPath = 'random_forest_cycle_predictor.pkl';
  
  try {
    const { data, error } = await downloadFile(bucketName, modelPath);
    
    if (error) {
      console.error('Error downloading cycle prediction model:', error);
      return { modelData: null, error };
    }
    
    return { modelData: data, error: null };
  } catch (err) {
    console.error('Exception downloading cycle prediction model:', err);
    return { modelData: null, error: err };
  }
};