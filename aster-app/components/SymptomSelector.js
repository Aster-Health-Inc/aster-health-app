import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { supabase } from '../lib/supabase';

const SymptomSelector = ({ selectedSymptoms, onSymptomsChange }) => {
  const [symptomCategories, setSymptomCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState(null);

  useEffect(() => {
    fetchSymptomCategories();
  }, []);

  const fetchSymptomCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('symptom_categories')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching symptoms:', error);
        Alert.alert('Error', 'Failed to load symptom categories');
      } else {
        // Group symptoms by category
        const grouped = data.reduce((acc, symptom) => {
          if (!acc[symptom.category]) {
            acc[symptom.category] = [];
          }
          acc[symptom.category].push(symptom);
          return acc;
        }, {});
        setSymptomCategories(grouped);
      }
    } catch (error) {
      console.error('Error fetching symptoms:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleSymptom = (symptom) => {
    const isSelected = selectedSymptoms.some(s => s.id === symptom.id);
    
    if (isSelected) {
      // Remove symptom
      const updated = selectedSymptoms.filter(s => s.id !== symptom.id);
      onSymptomsChange(updated);
    } else {
      // Add symptom with default severity
      const updated = [...selectedSymptoms, {
        id: symptom.id,
        name: symptom.name,
        emoji: symptom.emoji,
        severity: symptom.severity_scale ? 3 : null, // Default to medium severity
        severity_scale: symptom.severity_scale
      }];
      onSymptomsChange(updated);
    }
  };

  const updateSymptomSeverity = (symptomId, severity) => {
    const updated = selectedSymptoms.map(s => 
      s.id === symptomId ? { ...s, severity } : s
    );
    onSymptomsChange(updated);
  };

  const categoryNames = {
    physical: 'Physical Symptoms',
    emotional: 'Emotional',
    energy: 'Energy Levels',
    digestive: 'Digestive',
    sleep: 'Sleep',
    skin: 'Skin'
  };

  const categoryEmojis = {
    physical: '🤕',
    emotional: '💭',
    energy: '⚡',
    digestive: '🍽️',
    sleep: '😴',
    skin: '✨'
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading symptoms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How are you feeling?</Text>
      <Text style={styles.subtitle}>Tap symptoms you're experiencing</Text>

      <ScrollView style={styles.categoriesContainer} showsVerticalScrollIndicator={false}>
        {Object.entries(symptomCategories).map(([category, symptoms]) => (
          <View key={category} style={styles.categorySection}>
            <TouchableOpacity 
              style={styles.categoryHeader}
              onPress={() => setExpandedCategory(expandedCategory === category ? null : category)}
            >
              <View style={styles.categoryTitleContainer}>
                <Text style={styles.categoryEmoji}>{categoryEmojis[category]}</Text>
                <Text style={styles.categoryTitle}>{categoryNames[category]}</Text>
              </View>
              <Text style={styles.expandIcon}>
                {expandedCategory === category ? '−' : '+'}
              </Text>
            </TouchableOpacity>

            {expandedCategory === category && (
              <View style={styles.symptomsGrid}>
                {symptoms.map((symptom) => {
                  const isSelected = selectedSymptoms.some(s => s.id === symptom.id);
                  const selectedSymptom = selectedSymptoms.find(s => s.id === symptom.id);
                  
                  return (
                    <View key={symptom.id} style={styles.symptomContainer}>
                      <TouchableOpacity
                        style={[
                          styles.symptomButton,
                          isSelected && styles.symptomButtonSelected
                        ]}
                        onPress={() => toggleSymptom(symptom)}
                      >
                        <Text style={styles.symptomEmoji}>{symptom.emoji}</Text>
                        <Text style={[
                          styles.symptomText,
                          isSelected && styles.symptomTextSelected
                        ]}>
                          {symptom.name}
                        </Text>
                      </TouchableOpacity>

                      {isSelected && symptom.severity_scale && (
                        <View style={styles.severityContainer}>
                          <Text style={styles.severityLabel}>Severity:</Text>
                          <View style={styles.severityButtons}>
                            {[1, 2, 3, 4, 5].map((level) => (
                              <TouchableOpacity
                                key={level}
                                style={[
                                  styles.severityButton,
                                  selectedSymptom?.severity === level && styles.severityButtonSelected
                                ]}
                                onPress={() => updateSymptomSeverity(symptom.id, level)}
                              >
                                <Text style={[
                                  styles.severityButtonText,
                                  selectedSymptom?.severity === level && styles.severityButtonTextSelected
                                ]}>
                                  {level}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {selectedSymptoms.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedTitle}>Selected Symptoms:</Text>
          <View style={styles.selectedSymptoms}>
            {selectedSymptoms.map((symptom) => (
              <View key={symptom.id} style={styles.selectedSymptom}>
                <Text style={styles.selectedSymptomText}>
                  {symptom.emoji} {symptom.name}
                  {symptom.severity && ` (${symptom.severity}/5)`}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  categoriesContainer: {
    maxHeight: 300,
  },
  categorySection: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  expandIcon: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  symptomsGrid: {
    padding: 8,
  },
  symptomContainer: {
    marginBottom: 12,
  },
  symptomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  symptomButtonSelected: {
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
  },
  symptomEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  symptomText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  symptomTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  severityContainer: {
    marginTop: 8,
    paddingLeft: 12,
  },
  severityLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  severityButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  severityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  severityButtonSelected: {
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
  },
  severityButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  severityButtonTextSelected: {
    color: '#fff',
  },
  selectedContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectedSymptoms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedSymptom: {
    backgroundColor: '#e91e63',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectedSymptomText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
});

export default SymptomSelector;