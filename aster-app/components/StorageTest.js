import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { 
  downloadTextFile, 
  getPublicUrl, 
  listFiles,
  downloadMoodContextDocuments 
} from '../utils/supabaseStorage';

/**
 * Simple test component to verify Supabase storage access
 * Add this to your app temporarily to test your storage setup
 */
const StorageTest = () => {
  const [results, setResults] = useState('');
  const [loading, setLoading] = useState(false);

  const addResult = (message) => {
    setResults(prev => prev + '\n' + message);
  };

  const clearResults = () => {
    setResults('');
  };

  const testListFiles = async () => {
    setLoading(true);
    addResult('🔍 Testing file listing...');
    
    try {
      // Test context documents bucket
      const { files: contextFiles, error: contextError } = await listFiles('context-documents');
      
      if (contextError) {
        addResult(`❌ Error listing context-documents: ${contextError.message}`);
      } else {
        addResult(`✅ Found ${contextFiles.length} files in context-documents:`);
        contextFiles.forEach(file => addResult(`   - ${file.name}`));
      }

      // Test models bucket
      const { files: modelFiles, error: modelError } = await listFiles('models');
      
      if (modelError) {
        addResult(`❌ Error listing models: ${modelError.message}`);
      } else {
        addResult(`✅ Found ${modelFiles.length} files in models:`);
        modelFiles.forEach(file => addResult(`   - ${file.name}`));
      }

    } catch (error) {
      addResult(`❌ Exception: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDownloadTextFile = async () => {
    setLoading(true);
    addResult('📄 Testing text file download...');
    
    try {
      const { content, error } = await downloadTextFile('context-documents', 'mood_and_hormones.txt');
      
      if (error) {
        addResult(`❌ Error downloading text file: ${error.message}`);
      } else {
        addResult(`✅ Downloaded text file successfully`);
        addResult(`   Content length: ${content.length} characters`);
        addResult(`   First 100 chars: ${content.substring(0, 100)}...`);
      }
    } catch (error) {
      addResult(`❌ Exception: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testGetPublicUrl = async () => {
    addResult('🔗 Testing public URL generation...');
    
    try {
      const pdfUrl = getPublicUrl('context-documents', 'Mood_Swing_during_Menstruation.pdf');
      addResult(`✅ Generated public URL:`);
      addResult(`   ${pdfUrl}`);
    } catch (error) {
      addResult(`❌ Exception: ${error.message}`);
    }
  };

  const testDownloadAllContextDocs = async () => {
    setLoading(true);
    addResult('📚 Testing context documents download...');
    
    try {
      const { documents, error } = await downloadMoodContextDocuments();
      
      if (error) {
        addResult(`❌ Error downloading context documents: ${error.message}`);
      } else {
        addResult(`✅ Downloaded context documents successfully`);
        addResult(`   Documents loaded: ${Object.keys(documents).length}`);
        Object.keys(documents).forEach(docName => {
          if (typeof documents[docName] === 'string' && !docName.includes('.pdf')) {
            addResult(`   - ${docName}: ${documents[docName].length} chars`);
          } else {
            addResult(`   - ${docName}: URL generated`);
          }
        });
      }
    } catch (error) {
      addResult(`❌ Exception: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    clearResults();
    addResult('🚀 Running all Supabase storage tests...');
    addResult('═'.repeat(50));
    
    await testListFiles();
    addResult('');
    await testDownloadTextFile();
    addResult('');
    await testGetPublicUrl();
    addResult('');
    await testDownloadAllContextDocs();
    
    addResult('');
    addResult('✨ All tests completed!');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Supabase Storage Test</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runAllTests}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={testListFiles}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test File Listing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={testDownloadTextFile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Text Download</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={testGetPublicUrl}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Public URL</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={testDownloadAllContextDocs}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Context Docs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        <ScrollView style={styles.resultsScrollView}>
          <Text style={styles.resultsText}>{results || 'No tests run yet'}</Text>
        </ScrollView>
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
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#e91e63',
    padding: 15,
    marginBottom: 15,
  },
  clearButton: {
    backgroundColor: '#FF5722',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    minHeight: 300,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  resultsScrollView: {
    flex: 1,
  },
  resultsText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    lineHeight: 16,
  },
});

export default StorageTest;