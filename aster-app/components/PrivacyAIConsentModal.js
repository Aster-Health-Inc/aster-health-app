import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CONSENT_TEXT =
  'This feature sends limited information (such as food entries, cycle data, or messages) to third-party services in order to generate insights. These services include analytics providers and AI processing tools. Your data is used only to provide these features. Optional nutrition barcode lookups may also query a third-party food database.';

const PrivacyAIConsentModal = ({ visible, onAllow, onNotNow }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onNotNow}>
      <Pressable style={styles.backdrop} onPress={onNotNow}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>Data Sharing Consent</Text>
          <Text style={styles.body}>{CONSENT_TEXT}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onNotNow} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={onAllow} activeOpacity={0.9}>
              <Text style={styles.primaryButtonText}>Allow</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E1B57',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4A3B66',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#D9CFEE',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A3B66',
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#4B117B',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default PrivacyAIConsentModal;
