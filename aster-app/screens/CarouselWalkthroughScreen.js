import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

const CarouselWalkthroughScreen = ({ navigation }) => {

  const handleFinishOnboarding = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id)

      if (updateError) {
        console.log('❌ Failed to update onboarding_completed:', updateError)
        Alert.alert('Error', 'Something went wrong while finishing setup.')
        return
      }

      console.log('✅ Onboarding marked complete.')
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] })

    } catch (err) {
      console.log('❌ Unexpected error during onboarding completion:', err)
      Alert.alert('Error', 'Unexpected issue occurred.')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Aster!</Text>

      {/* ✅ Placeholder Feature Image */}
      <View style={styles.imageBox}>
        <Text style={styles.imageText}>Pictures that walk through our features</Text>
      </View>

      {/* ✅ Continue to Home and mark onboarding complete */}
      <TouchableOpacity style={styles.continueButton} onPress={handleFinishOnboarding}>
        <Text style={styles.continueText}>Start Using Aster →</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={async () => {
  await supabase.auth.signOut()
  navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] })
}}>
  <Text style={{ color: 'red', marginTop: 20 }}>🔁 Reset App (Logout)</Text>
</TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 20 },
  imageBox: { width: '90%', height: 200, backgroundColor: '#c5d6c2', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  imageText: { fontSize: 16, textAlign: 'center', color: '#333' },
  continueButton: { backgroundColor: '#000', paddingVertical: 12, width: '90%', borderRadius: 25, alignItems: 'center' },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default CarouselWalkthroughScreen;
