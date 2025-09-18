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
} from "react-native";

export default function ChatbotModal({ visible, onClose }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    { id: "sys-hello", role: "assistant", text: "Hi, how can I help today?" },
  ]);
  const listRef = useRef(null);

  useEffect(() => {
    if (visible) setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 0);
  }, [visible]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = { id: String(Date.now()), role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    try {
      // TODO: plug into your backend or Supabase Edge Function here.
      // For now, mock a reply.
      await new Promise((r) => setTimeout(r, 600));
      const reply = {
        id: `${userMsg.id}-reply`,
        role: "assistant",
        text: `You said: "${text}". I will route this to the right tool.`,
      };
      setMessages((m) => [...m, reply]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: `${userMsg.id}-err`, role: "assistant", text: "Sorry, I could not process that." },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 0);
    }
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
});
