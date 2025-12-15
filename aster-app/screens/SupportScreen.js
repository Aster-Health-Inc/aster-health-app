import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#EEE7FF';
const SURFACE = '#FFFFFF';

const SupportScreen = () => {
  const navigation = useNavigation();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.closeButton} activeOpacity={0.85} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={22} color="#3F2560" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Support</Text>
          <Text style={styles.subtitle}>
            Are you having trouble with anything? Ask us, we&apos;d love to help!
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputRowText}
              placeholder="Subject (max 50 chars)"
              placeholderTextColor="#9C92B2"
              value={subject}
              onChangeText={setSubject}
              maxLength={50}
            />
          </View>

          <View style={styles.inputCard}>
            <TextInput
              style={styles.textArea}
              multiline
              placeholder="Describe your issue..."
              placeholderTextColor="#9C92B2"
              value={message}
              onChangeText={setMessage}
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Send it over!</Text>
          </TouchableOpacity>

          <View style={styles.contactBlock}>
            <Text style={styles.contactText}>Have questions? Need help? Contact us.</Text>
            <Text style={styles.contactEmail}>buildwithaster@gmail.com</Text>
          </View>

          <TouchableOpacity style={styles.supportButton} activeOpacity={0.9}>
            <Ionicons name="mail-outline" size={20} color="#4B117B" />
            <Text style={styles.supportButtonText}>Support</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SupportScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2E2148',
  },
  subtitle: {
    fontSize: 13,
    color: '#4F4267',
    lineHeight: 18,
  },
  inputRow: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  inputRowText: {
    fontSize: 14,
    color: '#2E2148',
  },
  inputCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  textArea: {
    minHeight: 140,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#2E2148',
  },
  primaryButton: {
    backgroundColor: '#D3C3FF',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E2148',
  },
  contactBlock: {
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  contactText: {
    fontSize: 12,
    color: '#433760',
  },
  contactEmail: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E2148',
  },
  supportButton: {
    marginTop: 10,
    backgroundColor: '#D8C9FF',
    borderRadius: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E2148',
  },
});
