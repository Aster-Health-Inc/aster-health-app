import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { supabase } from '../lib/supabase'
import SymptomSelector from '../components/SymptomSelector'

const AddPeriodScreen = ({ navigation, route }) => {
  const editMode = route?.params?.editMode || false
  const periodData = route?.params?.periodData || {}
  
  const [startDate, setStartDate] = useState(editMode ? periodData.start_date : '')
  const [endDate, setEndDate] = useState(editMode ? periodData.end_date || '' : '')
  const [flowLevel, setFlowLevel] = useState(editMode ? periodData.flow_level : null)
  const [selectedSymptoms, setSelectedSymptoms] = useState(editMode ? [] : []) // Will be populated from old symptoms if editing
  const [mood, setMood] = useState(editMode ? periodData.mood || '' : '')
  const [energy, setEnergy] = useState(editMode ? periodData.energy || '' : '')
  const [notes, setNotes] = useState(editMode ? periodData.notes || '' : '')
  const [loading, setLoading] = useState(false)

  const flowLevels = [
    { value: 1, label: 'Light', color: '#ffcdd2' },
    { value: 2, label: 'Light-Medium', color: '#f8bbd9' },
    { value: 3, label: 'Medium', color: '#f48fb1' },
    { value: 4, label: 'Medium-Heavy', color: '#ec407a' },
    { value: 5, label: 'Heavy', color: '#e91e63' }
  ]

  const validateDate = (dateString) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateString)) return false
    
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date)
  }

  const formatDateForInput = (dateString) => {
    if (!dateString) return dateString
    return dateString.replace(/\D/g, '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
  }

  const handleStartDateChange = (text) => {
    const formatted = formatDateForInput(text)
    if (formatted.length <= 10) {
      setStartDate(formatted)
    }
  }

  const handleEndDateChange = (text) => {
    const formatted = formatDateForInput(text)
    if (formatted.length <= 10) {
      setEndDate(formatted)
    }
  }

  const handleSavePeriod = async () => {
    if (!startDate) {
      Alert.alert('Error', 'Please enter a start date')
      return
    }

    if (!validateDate(startDate)) {
      Alert.alert('Error', 'Please enter a valid start date (YYYY-MM-DD)')
      return
    }

    if (endDate && !validateDate(endDate)) {
      Alert.alert('Error', 'Please enter a valid end date (YYYY-MM-DD)')
      return
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      Alert.alert('Error', 'End date cannot be before start date')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Error', 'Not authenticated')
        return
      }

      // Keep old symptoms format for backward compatibility
      const symptomsArray = selectedSymptoms.map(s => s.name);

      const periodData = {
        ...(editMode ? {} : { user_id: user.id }),
        start_date: startDate,
        end_date: endDate || null,
        flow_level: flowLevel,
        symptoms: symptomsArray.length > 0 ? symptomsArray : null,
        mood: mood.trim() || null,
        energy: energy.trim() || null,
        notes: notes.trim() || null
      }

      let error
      let periodId
      
      if (editMode) {
        // Update existing period
        const { error: updateError } = await supabase
          .from('periods')
          .update(periodData)
          .eq('id', route.params.periodData.id)
        error = updateError
        periodId = route.params.periodData.id
      } else {
        // Insert new period
        const { data: insertData, error: insertError } = await supabase
          .from('periods')
          .insert([periodData])
          .select('id')
        error = insertError
        periodId = insertData?.[0]?.id
      }

      // Save structured symptoms to user_symptoms table
      if (!error && periodId && selectedSymptoms.length > 0) {
        // First, delete existing symptoms for this period (for edit mode)
        if (editMode) {
          await supabase
            .from('user_symptoms')
            .delete()
            .eq('period_id', periodId)
        }

        // Insert new symptoms
        const symptomEntries = selectedSymptoms.map(symptom => ({
          user_id: user.id,
          period_id: periodId,
          symptom_id: symptom.id,
          severity: symptom.severity || null
        }))

        const { error: symptomError } = await supabase
          .from('user_symptoms')
          .insert(symptomEntries)

        if (symptomError) {
          console.error('Error saving symptoms:', symptomError)
          // Don't fail the whole operation for symptom errors
        }
      }

      if (error) {
        console.error('Error saving period:', error)
        Alert.alert('Error', `Failed to ${editMode ? 'update' : 'save'} period entry`)
      } else {
        Alert.alert(
          'Success',
          `Period entry ${editMode ? 'updated' : 'saved'} successfully!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        )
      }
    } catch (error) {
      console.error('Error saving period:', error)
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editMode ? 'Edit Period' : 'Add Period'}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Period Dates</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Start Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={startDate}
              onChangeText={handleStartDateChange}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>End Date (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={endDate}
              onChangeText={handleEndDateChange}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flow Level</Text>
          <View style={styles.flowLevelContainer}>
            {flowLevels.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.flowLevelButton,
                  { backgroundColor: level.color },
                  flowLevel === level.value && styles.flowLevelSelected
                ]}
                onPress={() => setFlowLevel(level.value)}
              >
                <Text style={[
                  styles.flowLevelText,
                  flowLevel === level.value && styles.flowLevelTextSelected
                ]}>
                  {level.value}
                </Text>
                <Text style={[
                  styles.flowLevelLabel,
                  flowLevel === level.value && styles.flowLevelTextSelected
                ]}>
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SymptomSelector
            selectedSymptoms={selectedSymptoms}
            onSymptomsChange={setSelectedSymptoms}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Wellness</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mood & Emotions</Text>
            <Text style={styles.inputDescription}>
              How are you feeling? (e.g., happy, anxious, calm, irritable)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Describe your mood..."
              value={mood}
              onChangeText={setMood}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Energy Level</Text>
            <Text style={styles.inputDescription}>
              Rate your energy (e.g., high, medium, low, exhausted)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="How energetic do you feel?"
              value={energy}
              onChangeText={setEnergy}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any additional notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={handleSavePeriod}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{editMode ? 'Update Period Entry' : 'Save Period Entry'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    color: '#e91e63',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 5,
  },
  inputDescription: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  flowLevelContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  flowLevelButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 60,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  flowLevelSelected: {
    borderColor: '#333',
  },
  flowLevelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  flowLevelLabel: {
    fontSize: 10,
    color: '#333',
    marginTop: 2,
  },
  flowLevelTextSelected: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#e91e63',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default AddPeriodScreen