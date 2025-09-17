import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import AIModelService from '../services/AIModelService';

/**
 * Example component showing how to access context documents and models from Supabase
 */
const ExampleMoodPrediction = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [contextDocuments, setContextDocuments] = useState(null);
  const [serviceStatus, setServiceStatus] = useState('Not initialized');

  useEffect(() => {
    // Initialize AI Model Service when component mounts
    initializeService();
  }, []);

  const initializeService = async () => {
    try {
      setIsLoading(true);
      setServiceStatus('Initializing...');
      
      await AIModelService.initialize();
      
      setServiceStatus('Initialized successfully');
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize AI Model Service:', error);
      setServiceStatus('Initialization failed');
      setIsLoading(false);
      Alert.alert('Error', 'Failed to initialize AI services');
    }
  };

  const loadContextDocuments = async () => {
    try {
      setIsLoading(true);
      
      if (!AIModelService.isReady()) {
        Alert.alert('Error', 'AI Model Service not ready. Please initialize first.');
        return;
      }
      
      const documents = AIModelService.getMoodContext();
      setContextDocuments(documents);
      
      Alert.alert('Success', `Loaded ${Object.keys(documents).length} context documents`);
    } catch (error) {
      console.error('Error loading context documents:', error);
      Alert.alert('Error', 'Failed to load context documents');
    } finally {
      setIsLoading(false);
    }
  };

  const testMoodPrediction = async () => {
    try {
      if (!AIModelService.isReady()) {
        Alert.alert('Error', 'AI Model Service not ready. Please initialize first.');
        return;
      }
      
      // Get prepared context for mood prediction
      const context = AIModelService.prepareMoodContext();
      
      // Here you would typically send this context to your mood prediction API
      console.log('Mood prediction context:', context);
      
      Alert.alert(
        'Mood Prediction Context Ready',
        `Text context length: ${context.textContext.length} characters\nPDF URLs: ${context.pdfUrls.length} files`
      );
    } catch (error) {
      console.error('Error preparing mood prediction:', error);
      Alert.alert('Error', 'Failed to prepare mood prediction context');
    }
  };

  const getSpecificDocument = async () => {
    try {
      const document = AIModelService.getContextDocument('mood_and_hormones.txt');
      
      if (document) {
        Alert.alert(
          'Document Content',
          `First 200 characters:\n${document.substring(0, 200)}...`
        );
      } else {
        Alert.alert('Error', 'Document not found');
      }
    } catch (error) {
      console.error('Error getting document:', error);
      Alert.alert('Error', 'Failed to get document');
    }
  };

  const downloadCustomDocument = async () => {
    try {
      setIsLoading(true);
      
      // Example: Download a specific document from your Supabase bucket
      const bucketName = 'context-documents'; // Replace with your bucket name
      const filePath = 'mood_and_hormones.txt';
      
      const content = await AIModelService.downloadDocument(bucketName, filePath);
      
      Alert.alert(
        'Downloaded Document',
        `Content length: ${content.length} characters`
      );
    } catch (error) {
      console.error('Error downloading custom document:', error);
      Alert.alert('Error', 'Failed to download document');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>AI Model Service Example</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Service Status:</Text>
        <Text style={[
          styles.statusText,
          { color: serviceStatus.includes('success') ? '#4CAF50' : '#FF5722' }
        ]}>
          {serviceStatus}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={initializeService}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Initialize Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={loadContextDocuments}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Load Context Documents</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testMoodPrediction}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Mood Prediction Context</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={getSpecificDocument}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Get Specific Document</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={downloadCustomDocument}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Download Custom Document</Text>
        </TouchableOpacity>
      </View>

      {contextDocuments && (
        <View style={styles.documentsContainer}>
          <Text style={styles.documentsTitle}>Loaded Documents:</Text>
          {Object.keys(contextDocuments).map((docName) => (
            <Text key={docName} style={styles.documentItem}>
              • {docName}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Usage Information:</Text>
        <Text style={styles.infoText}>
          1. First, initialize the service to download documents from Supabase{'\n'}
          2. Load context documents for mood prediction{'\n'}
          3. Use the context for AI predictions{'\n'}
          4. Access specific documents as needed
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#e91e63',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  documentsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  documentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  documentItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
});

export default ExampleMoodPrediction;