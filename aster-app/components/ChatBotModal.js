// components/ChatbotModal.js
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { supabase } from '../lib/supabase';
import ChatbotDataService from '../services/chatbotDataService';
import ChatbotAPIService from '../services/chatbotAPIService';

export default function ChatbotModal({ visible, onClose }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState(null);
  const [messages, setMessages] = useState([
    { id: "sys-hello", role: "assistant", text: "Hi! I'm loading your health data to provide personalized assistance..." },
  ]);
  const listRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 0);
      loadUserData();
    }
  }, [visible]);

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
        text: "Hi! I had trouble loading your data, but I can still help with general health questions. What would you like to know?"
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
    const { latestPeriod, analytics, userProfile } = data;

    let welcome = "Hi";
    if (userProfile?.name) {
      welcome += ` ${userProfile.name}`;
    }
    welcome += "! 🌸\n\n";

    welcome += "I have your health data ready:\n";

    if (latestPeriod) {
      welcome += `• Latest period: ${latestPeriod.start_date}`;
      if (latestPeriod.end_date) {
        welcome += ` to ${latestPeriod.end_date}`;
      }
      welcome += "\n";
    }

    welcome += `• Health tracking: ${analytics.total_interactions} total interactions\n`;
    welcome += `• Data accuracy: ${analytics.accuracy}%\n\n`;

    welcome += "I can help with period tracking, health insights, nutrition advice, and answer questions about your cycle. What would you like to know?";

    return welcome;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = { id: String(Date.now()), role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    try {
      // Prepare context for chatbot
      const contextString = userContext ?
        ChatbotDataService.formatDataForChatbot(userContext) :
        "No user data available.";

      // Create enhanced prompt with user context
      const enhancedPrompt = `${contextString}\n\nUser Query: ${text}\n\nPlease provide a helpful response based on the user's health data and query.`;

      // Call real chatbot API (with ngrok public URL)
      const result = await ChatbotAPIService.sendMessage(
        text,
        userContext,
        'https://7306ee798ee5.ngrok-free.app/api/chat'
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
        context: contextString,
        response: result.response,
        success: result.success,
        apiError: result.error || null
      });

    } catch (e) {
      console.error('Error sending message:', e);
      setMessages((m) => [
        ...m,
        { id: `${userMsg.id}-err`, role: "assistant", text: "Sorry, I could not process that. Please try again." },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 0);
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
          <Text style={[styles.bubbleText, isUser ? styles.userText : styles.botText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Aster Assistant</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.loadingText}>Loading your health data...</Text>
          </View>
        )}

        {/* Composer */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <View style={styles.composer}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type your message"
              placeholderTextColor="#9a9a9a"
              style={styles.input}
              multiline
            />
            <Pressable
              onPress={sendMessage}
              disabled={sending || input.trim().length === 0}
              style={({ pressed }) => [
                styles.sendBtn,
                (sending || input.trim().length === 0) && { opacity: 0.5 },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.sendText}>{sending ? "..." : "Send"}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f10" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2a2a2c",
    flexDirection: "row",
    alignItems: "center",
  },
  title: { color: "white", fontSize: 18, fontWeight: "700", flex: 1 },
  closeBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: "#1f1f22" },
  closeText: { color: "white", fontWeight: "600" },

  bubbleRow: { marginVertical: 6, flexDirection: "row" },
  leftRow: { justifyContent: "flex-start" },
  rightRow: { justifyContent: "flex-end" },
  bubble: { maxWidth: "78%", padding: 12, borderRadius: 16 },
  botBubble: { backgroundColor: "#1c1c1e", borderTopLeftRadius: 4 },
  userBubble: { backgroundColor: "#4A90E2", borderTopRightRadius: 4 },
  botText: { color: "#eaeaea" },
  userText: { color: "white" },
  bubbleText: { fontSize: 15, lineHeight: 20 },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#2a2a2c",
    backgroundColor: "#141416",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#1a1b1e",
    borderRadius: 12,
  },
  sendBtn: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#4A90E2",
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: "white", fontWeight: "700" },

  // Loading styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#2a2a2c",
    backgroundColor: "#141416",
  },
  loadingText: {
    color: "#9a9a9a",
    marginLeft: 8,
    fontSize: 14,
  },
});
