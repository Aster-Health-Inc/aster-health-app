import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const BACKGROUND = '#E9E2F4';
const CARD = '#FFFFFF';
const TEXT_PRIMARY = '#2D1B4E';
const TEXT_MUTED = '#7D7394';
const ACCENT = '#4B117B';
const BORDER = '#E6E0F0';
const INPUT_BG = '#F7F5FB';

const formatLocalDateKey = (inputDate) => {
  const d = new Date(inputDate || new Date());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* INPUT WITH UNIT */
const InputWithUnit = ({
  label,
  value,
  onChangeText,
  unit,
  editable = true,
}) => (
  <View style={styles.inputCard}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.unitInputContainer}>
      <TextInput
        style={[
          styles.unitTextInput,
          !editable && { backgroundColor: '#F1EEF7' },
        ]}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
        editable={editable}
      />
      <View style={styles.unitBadge}>
        <Text style={styles.unitText}>{unit}</Text>
      </View>
    </View>
  </View>
);

const AddFoodScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { mealType, selectedDate } = route.params || {};
  const resolvedMealType = mealType || 'Meal';

  const [foodName, setFoodName] = useState('');
  const [weight, setWeight] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [saving, setSaving] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);

  /* 🔍 SEARCH */
  const searchFood = async (text) => {
    setFoodName(text);
    setSelectedFood(null);

    if (text.length < 2) {
      setSuggestions([]);
      return;
    }

    const { data } = await supabase
      .from('test_food')
      .select('*')
      .ilike('name', `%${text}%`)
      .limit(6);

    setSuggestions(data || []);
  };

  /* SELECT FOOD */
  const onSelectFood = (food) => {
    setSelectedFood(food);
    setFoodName(food.name);

    setWeight(String(food.serving_size));
    setCalories(String(food.calories));
    setProtein(String(food.protein));
    setCarbs(String(food.carbs));
    setFats(String(food.fat));

    setSuggestions([]);
  };

  /* RECALCULATE */
  const onWeightChange = (value) => {
    setWeight(value);

    if (!selectedFood) return;

    const qty = parseFloat(value);
    if (isNaN(qty) || qty <= 0) return;

    const factor = qty / selectedFood.serving_size;

    setCalories(Math.round(selectedFood.calories * factor).toString());
    setProtein((selectedFood.protein * factor).toFixed(1));
    setCarbs((selectedFood.carbs * factor).toFixed(1));
    setFats((selectedFood.fat * factor).toFixed(1));
  };

  /* SAVE */
  const handleAddToLog = async () => {
    if (!foodName || !calories) {
      Alert.alert('Missing information');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const logDate = formatLocalDateKey(selectedDate);

      const caloriesNum = parseFloat(calories);
      const proteinNum = parseFloat(protein) || 0;
      const carbsNum = parseFloat(carbs) || 0;
      const fatNum = parseFloat(fats) || 0;

      const { data: existingLog } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', logDate)
        .maybeSingle();

      let logId = existingLog?.id;

      if (!existingLog) {
        const { data } = await supabase
          .from('meal_logs')
          .insert({
            user_id: user.id,
            log_date: logDate,
            total_calories: caloriesNum,
            total_protein: proteinNum,
            total_carbs: carbsNum,
            total_fat: fatNum,
          })
          .select()
          .single();
        logId = data.id;
      } else {
        await supabase.from('meal_logs').update({
          total_calories: existingLog.total_calories + caloriesNum,
          total_protein: existingLog.total_protein + proteinNum,
          total_carbs: existingLog.total_carbs + carbsNum,
          total_fat: existingLog.total_fat + fatNum,
        }).eq('id', logId);
      }

      await supabase.from('meals').insert({
        log_id: logId,
        meal_type: resolvedMealType,
        calories: caloriesNum,
        protein: proteinNum,
        carbs: carbsNum,
        fat: fatNum,
      });

      Alert.alert('Success', 'Food added', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <TouchableOpacity
                style={styles.photoButton}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Camera', { mealType: resolvedMealType })}
              >
                <Ionicons name="camera-outline" size={18} color={ACCENT} />
                <Text style={styles.photoButtonText}>Take a photo instead</Text>
              </TouchableOpacity>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Food Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={foodName}
                  onChangeText={searchFood}
                />
              </View>

              {suggestions.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.suggestionItem}
                  onPress={() => onSelectFood(item)}
                >
                  <Text>{item.name}</Text>
                </TouchableOpacity>
              ))}

              <InputWithUnit
                label={`Quantity (${selectedFood?.serving_unit || 'g'})`}
                value={weight}
                onChangeText={onWeightChange}
                unit={selectedFood?.serving_unit || 'g'}
              />

              <InputWithUnit label="Calories" value={calories} unit="kcal" editable={!selectedFood} />
              <InputWithUnit label="Protein" value={protein} unit="g" editable={!selectedFood} />
              <InputWithUnit label="Carbs" value={carbs} unit="g" editable={!selectedFood} />
              <InputWithUnit label="Fats" value={fats} unit="g" editable={!selectedFood} />

            </ScrollView>

            <TouchableOpacity style={styles.addButton} onPress={handleAddToLog}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.addButtonText}>Add to Food Log</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddFoodScreen;

/* STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  scrollContent: { padding: 20, paddingBottom: 140 },
  inputCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#C7BDE8',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  inputLabel: { fontWeight: '700', marginBottom: 6, color: TEXT_PRIMARY },
  textInput: {
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT_PRIMARY,
  },

  unitInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  unitTextInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  unitBadge: {
    paddingHorizontal: 10,
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
  },
  unitText: {
    fontWeight: '600',
    color: ACCENT,
  },

  suggestionItem: {
    padding: 12,
    backgroundColor: CARD,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F2FB',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  photoButtonText: {
    color: ACCENT,
    fontWeight: '700',
  },

  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: ACCENT,
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  addButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
