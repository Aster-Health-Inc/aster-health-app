import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

const CarouselWalkthroughScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Aster!</Text>

      {/* ✅ Placeholder Feature Image */}
      <View style={styles.imageBox}>
        <Text style={styles.imageText}>Pictures that walk through our features</Text>
      </View>

      {/* ✅ Continue to Dashboard */}
      <TouchableOpacity style={styles.continueButton} onPress={() => navigation.navigate('Dashboard')}>
        <Text style={styles.continueText}>Continue →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5E6D3', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 20 },
  imageBox: { width: '90%', height: 200, backgroundColor: '#c5d6c2', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  imageText: { fontSize: 16, textAlign: 'center', color: '#333' },
  continueButton: { backgroundColor: '#000', paddingVertical: 12, width: '90%', borderRadius: 25, alignItems: 'center' },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default CarouselWalkthroughScreen;
