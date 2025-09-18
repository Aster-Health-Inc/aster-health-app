// components/FloatingChatButton.js
import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";

export default function FloatingChatButton({ onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Open chat"
      style={({ pressed }) => [
        styles.fab,
        pressed && { transform: [{ scale: 0.98 }] },
        disabled && { opacity: 0.6 },
      ]}
      hitSlop={10}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>AI</Text>
      </View>
      <Text style={styles.fabText}>Chat</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    bottom: 96,
    height: 56,
    minWidth: 56,
    borderRadius: 28,
    paddingHorizontal: 18,
    backgroundColor: "#1c1c1e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
    zIndex: 999,
  },
  fabText: { color: "white", fontWeight: "600", fontSize: 16, marginLeft: 8 },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#4A90E2",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "white", fontWeight: "700", fontSize: 12 },
});
