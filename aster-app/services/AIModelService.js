import { 
  downloadMoodContextDocuments, 
  downloadCyclePredictionModel,
  downloadTextFile,
  getPublicUrl 
} from '../utils/supabaseStorage';

/**
 * Service for managing AI models and context documents from Supabase
 */
class AIModelService {
  constructor() {
    this.contextDocuments = null;
    this.cyclePredictionModel = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the service by downloading required files
   */
  async initialize() {
    try {
      console.log('Initializing AI Model Service...');
      
      // Download context documents for mood prediction
      await this.loadContextDocuments();
      
      // Download cycle prediction model (for future use)
      // await this.loadCyclePredictionModel();
      
      this.isInitialized = true;
      console.log('AI Model Service initialized successfully');
    } catch (error) {
      console.error('Error initializing AI Model Service:', error);
      throw error;
    }
  }

  /**
   * Load context documents from Supabase storage
   */
  async loadContextDocuments() {
    try {
      const { documents, error } = await downloadMoodContextDocuments();
      
      if (error) {
        console.error('Error loading context documents:', error);
        throw error;
      }
      
      this.contextDocuments = documents;
      console.log('Context documents loaded:', Object.keys(documents));
      return documents;
    } catch (error) {
      console.error('Failed to load context documents:', error);
      throw error;
    }
  }

  /**
   * Load cycle prediction model from Supabase storage
   */
  async loadCyclePredictionModel() {
    try {
      const { modelData, error } = await downloadCyclePredictionModel();
      
      if (error) {
        console.error('Error loading cycle prediction model:', error);
        throw error;
      }
      
      this.cyclePredictionModel = modelData;
      console.log('Cycle prediction model loaded successfully');
      return modelData;
    } catch (error) {
      console.error('Failed to load cycle prediction model:', error);
      throw error;
    }
  }

  /**
   * Get mood context for predictions
   * @returns {Object} Context documents for mood analysis
   */
  getMoodContext() {
    if (!this.isInitialized || !this.contextDocuments) {
      throw new Error('AI Model Service not initialized. Call initialize() first.');
    }
    
    return this.contextDocuments;
  }

  /**
   * Get specific context document content
   * @param {string} documentName - Name of the document
   * @returns {string} Document content
   */
  getContextDocument(documentName) {
    if (!this.contextDocuments || !this.contextDocuments[documentName]) {
      console.warn(`Context document '${documentName}' not found`);
      return null;
    }
    
    return this.contextDocuments[documentName];
  }

  /**
   * Download a specific document from Supabase storage
   * @param {string} bucketName - Storage bucket name
   * @param {string} filePath - File path in the bucket
   * @returns {Promise<string>} File content
   */
  async downloadDocument(bucketName, filePath) {
    try {
      const { content, error } = await downloadTextFile(bucketName, filePath);
      
      if (error) {
        console.error(`Error downloading document ${filePath}:`, error);
        throw error;
      }
      
      return content;
    } catch (error) {
      console.error('Failed to download document:', error);
      throw error;
    }
  }

  /**
   * Get public URL for a document (useful for PDFs)
   * @param {string} bucketName - Storage bucket name
   * @param {string} filePath - File path in the bucket
   * @returns {string} Public URL
   */
  getDocumentUrl(bucketName, filePath) {
    return getPublicUrl(bucketName, filePath);
  }

  /**
   * Prepare context for mood prediction API call
   * @returns {Object} Formatted context for API
   */
  prepareMoodContext() {
    const context = this.getMoodContext();
    
    // Combine text documents for context
    const combinedContext = [
      context['mood_and_hormones.txt'],
      context['physical_effects.txt']
    ].filter(Boolean).join('\n\n');
    
    return {
      textContext: combinedContext,
      pdfUrls: [
        context['Mood_Swing_during_Menstruation.pdf'],
        context['Psychiatric_Symptoms_Across_the_Menstrual_Cycle_in_Adult_Women.pdf'],
        context['window_of_vulnerability.pdf']
      ].filter(Boolean)
    };
  }

  /**
   * Check if service is ready for use
   * @returns {boolean} True if initialized
   */
  isReady() {
    return this.isInitialized && this.contextDocuments !== null;
  }
}

// Export singleton instance
export default new AIModelService();