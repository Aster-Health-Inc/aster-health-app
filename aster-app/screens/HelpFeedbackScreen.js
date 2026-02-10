import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#EEE7FF';
const SURFACE = '#FFFFFF';
const ACCENT = '#4B117B';

const ACTIONS = [
  { key: 'bug', label: 'Report Bug', icon: 'bug-outline', route: 'ReportBug' },
  { key: 'feedback', label: 'Feedback', icon: 'chatbubble-ellipses-outline', route: 'Feedback' },
  { key: 'support', label: 'Support', icon: 'mail-open-outline', route: 'Support' },
];

const FAQ_ITEMS = [
  {
    question: "Why isn't my period estimate accurate yet?",
    answer:
      'Aster improves estimates as you log more data. To improve estimate quality, track at least 2-3 cycles and include routine factors like stress, food, and workouts.',
  },
  {
    question: 'Can I edit or delete past entries?',
    answer:
      'Yes! Tap any logged entry to edit or delete it. For period dates, go to Cycle and tap a past date in the calendar. Your insights will update automatically.',
  },
  {
    question: 'Do I need to log everything daily?',
    answer:
      'Not necessarily. The more you track, the deeper your insights—but even logging just your period and occasional moods provides useful patterns you can build on.',
  },
  {
    question: 'How does the AI chatbot keep my data private?',
    answer:
      'Your health data is encrypted and never shared with third parties. The AI uses your logged data to provide general wellness information, and conversations remain secure in your account.',
  },
  {
    question: 'What do the insights actually tell me?',
    answer:
      'Insights connect the dots between your cycle, mood, food, and workouts. They highlight patterns (like cravings before your period) so you can understand your body better.',
  },
];

const HelpFeedbackScreen = () => {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [openQuestion, setOpenQuestion] = useState(null);

  const toggleQuestion = (key) => {
    setOpenQuestion((current) => (current === key ? null : key));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.closeButton}
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={22} color="#3F2560" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>Help & Support</Text>
            <Text style={styles.subtitle}>Need help? We&apos;re here to support you all the way 💜</Text>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#7E739A" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for help..."
              placeholderTextColor="#9C92B2"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <View style={styles.actionsRow}>
            {ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.actionCard}
                activeOpacity={0.85}
                onPress={() => action.route && navigation.navigate(action.route)}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name={action.icon} size={22} color={ACCENT} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Common Questions</Text>

          <View style={styles.faqList}>
            {FAQ_ITEMS.map((item) => {
              const isOpen = openQuestion === item.question;
              return (
                <View key={item.question} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    activeOpacity={0.85}
                    onPress={() => toggleQuestion(item.question)}
                  >
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#4B3A6C"
                    />
                  </TouchableOpacity>
                  {isOpen && (
                    <View style={styles.faqAnswerWrap}>
                      <Text style={styles.faqAnswer}>{item.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.emergency}>
            <View style={styles.emergencyIconWrap}>
              <Ionicons name="alert-circle" size={20} color="#D84A4A" />
            </View>
            <Text style={styles.emergencyTitle}>EMERGENCY SUPPORT</Text>
            <Text style={styles.emergencyText}>
              For urgent health concerns, contact a qualified healthcare professional immediately.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default HelpFeedbackScreen;

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
    paddingBottom: 50,
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
  headerTextGroup: {
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F1635',
  },
  subtitle: {
    fontSize: 14,
    color: '#5A4B76',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 42,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#2E2148',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E2148',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3C2B56',
    marginTop: 6,
  },
  faqList: {
    gap: 12,
  },
  faqCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#2E2148',
    paddingRight: 12,
  },
  faqAnswerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 2,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#4A3A66',
    lineHeight: 19,
    backgroundColor: '#F5F0FF',
    padding: 12,
    borderRadius: 14,
  },
  emergency: {
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  emergencyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FCE6E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E2148',
    letterSpacing: 0.4,
  },
  emergencyText: {
    fontSize: 12,
    color: '#3E2F53',
    textAlign: 'center',
    lineHeight: 18,
  },
});
