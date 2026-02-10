import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const ASTER_MEDICAL_DISCLAIMER =
  'Aster is intended for general wellness and educational purposes only. It is not a medical device and does not provide medical diagnosis, advice, or treatment. Always consult a qualified healthcare professional before making medical decisions.';

const Disclaimer = ({ style, compact = false }) => {
  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      <Text style={styles.title}>General Wellness Disclaimer</Text>
      <Text style={[styles.body, compact && styles.bodyCompact]}>{ASTER_MEDICAL_DISCLAIMER}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F6F1FF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(75,17,123,0.15)',
  },
  containerCompact: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#4B117B',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 12,
    lineHeight: 17,
    color: '#5F5478',
  },
  bodyCompact: {
    fontSize: 11,
    lineHeight: 16,
  },
});

export default Disclaimer;
