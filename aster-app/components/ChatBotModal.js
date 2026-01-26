// components/ChatbotModal.js
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import Svg, { Path } from 'react-native-svg';
import { Dimensions } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { usePostHog } from 'posthog-react-native';
import ChatbotDataService from '../services/chatbotDataService';
import ChatbotAPIService from '../services/chatbotAPIService_EdgeFunction';

export default function ChatbotModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const posthog = usePostHog();
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const scrollRef = useRef(null);
  const waveOffsets = Array.from(
    { length: Math.ceil(Dimensions.get('window').height / 28) + 2 },
    (_, i) => i * 28,
  );

  useEffect(() => {
    if (visible) {
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: false }), 0);
      if (!hasShownWelcome) {
        // Only load and show welcome on first open
        setMessages([{ id: "sys-hello", role: "assistant", text: "Hey! Getting your health data ready... ✨" }]);
        loadUserData();
      }
    }
  }, [visible, hasShownWelcome]);

  /**
   * Load user data when modal opens
   */
  const loadUserData = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Fetch comprehensive user data
      const result = await ChatbotDataService.fetchUserChatbotData(user.id);

      if (result.success) {
        setUserContext(result.data);

        // Update welcome message with personalized info
        const welcomeMessage = generateWelcomeMessage(result.data);
        setMessages([{
          id: "sys-welcome",
          role: "assistant",
          text: welcomeMessage
        }]);

        setHasShownWelcome(true); // Mark welcome as shown

        console.log('User context loaded:', result.data);
      } else {
        throw new Error(result.error || 'Failed to load user data');
      }

    } catch (error) {
      console.error('Error loading user data:', error);

      // Fallback message
      setMessages([{
        id: "sys-error",
        role: "assistant",
        text: "Oops, had a little trouble loading your data 😅 but no worries! I can still help with your health questions. What's on your mind?"
      }]);

      // Set fallback context
      setUserContext(ChatbotDataService.getFallbackData());
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate personalized welcome message based on user data
   */
const generateWelcomeMessage = (data) => {
  const { latestPeriod, userProfile } = data;

  let welcome = "Hey";
  if (userProfile?.name) {
      welcome += ` ${userProfile.name}`;
    }
    welcome += "! 💜\n\n";

    if (latestPeriod) {
      const daysSince = Math.floor((new Date() - new Date(latestPeriod.start_date)) / (1000 * 60 * 60 * 24));
      welcome += `Your last period started ${daysSince} days ago!\n\n`;
    }

    welcome += "I'm here for all your health, cycle, and nutrition questions! 💬\n\n";
    welcome += "✨ Note: I'm an AI assistant, not a doctor, so for serious medical concerns please see a healthcare professional!";

    return welcome;
  };

const MarkdownInline = ({ content, textStyle, indexKey }) => {
  const baseStyle = StyleSheet.flatten([styles.markdownText, textStyle]);
  const pieces = String(content ?? '').split(/\*\*(.+?)\*\*/g);

  return (
    <Text style={baseStyle}>
      {pieces.map((piece, idx) => {
        if (!piece) return null;
        const isBold = idx % 2 === 1;
        return (
          <Text
            key={`${indexKey}-piece-${idx}`}
            style={isBold ? [baseStyle, styles.boldText] : baseStyle}
          >
            {piece}
          </Text>
        );
      })}
    </Text>
  );
};

const MarkdownBubble = ({ text }) => {
  if (!text) return null;

  const lines = String(text).split(/\r?\n/);

  return (
    <View style={styles.markdownContainer}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed.length) {
          return <View key={`space-${idx}`} style={styles.markdownSpacer} />;
        }

        if (/^[-*]\s+/.test(trimmed)) {
          const content = trimmed.replace(/^[-*]\s+/, '');
          return (
            <View key={`bullet-${idx}`} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <MarkdownInline
                content={content}
                textStyle={styles.bulletText}
                indexKey={`bullet-${idx}`}
              />
            </View>
          );
        }

        return (
          <View key={`line-${idx}`} style={styles.paragraph}>
            <MarkdownInline content={trimmed} indexKey={`line-${idx}`} />
          </View>
        );
      })}
    </View>
  );
};

  /**
   * Clear conversation and start fresh
   */
  const handleEndChat = () => {
    setMessages([]);
    setInput("");
    setHasShownWelcome(false);
    // Reload user data to show fresh welcome message
    loadUserData();
  };

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    const userMsg = { id: String(Date.now()), role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    posthog?.capture('chatbot_used', {
      prompt_length: text.length,
    });

    try {
      // Call Gemini AI chatbot (it will format the context internally)
      const result = await ChatbotAPIService.sendMessage(
        text,
        userContext
      );

      const reply = {
        id: `${userMsg.id}-reply`,
        role: "assistant",
        text: result.success ? result.response : result.response, // Fallback response included in API service
      };
      setMessages((m) => [...m, reply]);

      // Log the interaction for analytics
      console.log('Chatbot interaction:', {
        query: text,
        response: result.response,
        success: result.success,
        apiError: result.error || null
      });

    } catch (e) {
      console.error('Error sending message:', e);
      setMessages((m) => [
        ...m,
        { id: `${userMsg.id}-err`, role: "assistant", text: "Sorry, something went wrong 😅 Could you try asking again?" },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 0);
    }
  };


  /**
   * Generate context-aware response (mock implementation)
   * Replace this with actual API call to your chatbot service
   */
  const generateContextAwareResponse = (query, context) => {
    const lowerQuery = query.toLowerCase();

    if (!context || context.isFallback) {
      return "I don't have access to your health data right now, but I'm here to help with general health questions. Could you provide more details about what you'd like to know?";
    }

    // Period-related queries
    if (lowerQuery.includes('period') || lowerQuery.includes('cycle')) {
      if (context.latestPeriod) {
        const daysSince = Math.floor((new Date() - new Date(context.latestPeriod.start_date)) / (1000 * 60 * 60 * 24));
        return `Based on your data, your last period started on ${context.latestPeriod.start_date} (${daysSince} days ago). ${
          context.cyclePredictions.length > 0 ?
          `Your next period is predicted for around ${context.cyclePredictions[0].predicted_period_date}.` :
          'Would you like me to help predict your next cycle?'
        }`;
      } else {
        return "I don't see any period data yet. Would you like to log your current or recent period to get started with tracking?";
      }
    }

    // Analytics/stats queries
    if (lowerQuery.includes('stats') || lowerQuery.includes('analytics') || lowerQuery.includes('data')) {
      return `Here are your current stats:\n• Total interactions: ${context.analytics.total_interactions}\n• Data accuracy: ${context.analytics.accuracy}%\n• Successful matches: ${context.analytics.matches}\n\nYour tracking has been ${context.analytics.accuracy > 80 ? 'excellent' : 'good'} - keep it up!`;
    }

    // Nutrition queries
    if (lowerQuery.includes('food') || lowerQuery.includes('nutrition') || lowerQuery.includes('meal')) {
      if (context.recentMeals.length > 0) {
        const avgCalories = context.recentMeals.reduce((sum, meal) => sum + (meal.total_calories || 0), 0) / context.recentMeals.length;
        return `Based on your recent meal logs, you're averaging ${Math.round(avgCalories)} calories per day. ${
          avgCalories < 1500 ? 'Consider increasing your intake to support your health goals.' :
          avgCalories > 2500 ? 'You might want to review your portion sizes.' :
          'Your nutrition tracking looks balanced!'
        }`;
      } else {
        return "I don't see any recent meal logs. Would you like to start tracking your nutrition? I can help you log meals and monitor your intake.";
      }
    }

    // Default response with context
    return `I see you're asking about "${query}". Based on your health profile, I can provide personalized advice. ${
      context.latestPeriod ? `Since your last period was ${context.latestPeriod.start_date}, ` : ''
    }how can I help you with your health tracking today?`;
  };

  const renderItem = ({ item }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.bubbleRow, isUser ? styles.rightRow : styles.leftRow]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
          {isUser ? (
            <Text style={[styles.bubbleText, styles.userText]}>
              {item.text}
            </Text>
          ) : (
            <MarkdownBubble text={item.text} />
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            paddingTop: insets.top,
            paddingBottom: Math.max(12, insets.bottom),
          },
        ]}
        edges={['top', 'bottom']}
      >
        <View style={styles.container}>
          <Svg width="100%" height="100%" style={styles.waves} preserveAspectRatio="none">
            {waveOffsets.map((offset) => (
              <Path
                key={`wave-${offset}`}
                d={`M0 ${offset + 12} Q40 ${offset} 80 ${offset + 12} T160 ${offset + 12} T240 ${offset + 12} T320 ${offset + 12} T400 ${offset + 12}`}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3"
                opacity={0.35}
              />
            ))}
          </Svg>

          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
              <Ionicons name="close" size={22} color="#3F2560" />
            </Pressable>
            <Pressable onPress={handleEndChat} style={styles.endChatBtn} accessibilityRole="button">
              <Ionicons name="refresh" size={20} color="#3F2560" />
              <Text style={styles.endChatText}>New Chat</Text>
            </Pressable>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 24 : 0}
          >
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[
                styles.scrollContent,
                { flexGrow: 1 },
                { paddingBottom: 120 + insets.bottom },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.suggestionWrap}>
                {['When is my next period coming?', 'What foods should I avoid right now?', 'What is the Luteal Phase?', 'Why is my estrogen higher than usual?'].map(
                  (q) => (
                    <TouchableOpacity
                      key={q}
                      style={styles.suggestionPill}
                      activeOpacity={0.85}
                      onPress={() => {
                        setInput(q);
                        sendMessage(q);
                      }}
                    >
                      <Text style={styles.suggestionText}>{q}</Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>

              <View style={styles.messagesArea}>
                {messages.map((m) => (
                  <View
                    key={m.id}
                    style={[styles.bubbleRow, m.role === 'user' ? styles.rightRow : styles.leftRow]}
                  >
                    <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.botBubble]}>
                      {m.role === 'user' ? (
                        <Text style={[styles.bubbleText, styles.userText]}>{m.text}</Text>
                      ) : (
                        <MarkdownBubble text={m.text} />
                      )}
                    </View>
                  </View>
                ))}

                {!messages.length && (
                  <View style={[styles.bubbleRow, styles.leftRow]}>
                    <View style={[styles.bubble, styles.botBubble]}>
                      <Text style={styles.bubbleText}>
                        Hey there! 👋{'\n'}Ask me anything or tap one of the suggested questions above to get started!
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#4A90E2" />
                  <Text style={styles.loadingText}>Loading your health data...</Text>
                </View>
              )}
            </ScrollView>

            <View
              style={[
                styles.composer,
                {
                  paddingBottom: 8 + insets.bottom * 0.6,
                  marginBottom: Math.max(8, insets.bottom / 2),
                },
              ]}
            >
              <Ionicons name="search" size={18} color="#807499" style={styles.leadingIcon} />
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Type your message..."
                placeholderTextColor="#9A90B0"
                style={styles.input}
                multiline
              />
              <Pressable
                onPress={() => sendMessage()}
                disabled={sending || input.trim().length === 0}
                style={({ pressed }) => [
                  styles.sendBtn,
                  (sending || input.trim().length === 0) && { opacity: 0.4 },
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <Ionicons
                  name="send"
                  size={18}
                  color="#4B117B"
                />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EDE6FF' },
  container: { flex: 1, backgroundColor: '#EDE6FF' },
  waves: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F6F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  endChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F6F2FF',
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  endChatText: {
    color: '#3F2560',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 4,
    gap: 16,
  },
  suggestionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  suggestionPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F6F2FF',
    borderRadius: 18,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  suggestionText: {
    color: '#3A2B58',
    fontWeight: '600',
    fontSize: 13,
  },
  messagesArea: {
    gap: 10,
    paddingTop: 6,
  },
  bubbleRow: { marginVertical: 2, flexDirection: "row" },
  leftRow: { justifyContent: "flex-start" },
  rightRow: { justifyContent: "flex-end" },
  bubble: { maxWidth: "80%", padding: 12, borderRadius: 16 },
  botBubble: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 6, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  userBubble: { backgroundColor: "#E1D7FF", borderTopRightRadius: 6 },
  bubbleText: { fontSize: 15, lineHeight: 20, color: '#2E2148' },
  userText: { color: '#2E2148' },

  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F2FF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  leadingIcon: { marginRight: 6 },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    color: '#2E2148',
    paddingVertical: 6,
    fontSize: 14,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8DEFF',
    marginLeft: 8,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  loadingText: {
    color: "#6A5B86",
    marginLeft: 8,
    fontSize: 14,
  },
  markdownContainer: {
    flexShrink: 1,
  },
  markdownSpacer: {
    height: 6,
  },
  paragraph: {
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2F7D78',
    marginTop: 8,
    marginRight: 8,
  },
  markdownText: {
    color: '#2E2148',
    fontSize: 15,
    lineHeight: 20,
  },
  bulletText: {
    flexShrink: 1,
  },
  boldText: {
    fontWeight: '700',
    color: '#2E2148',
  },
});
