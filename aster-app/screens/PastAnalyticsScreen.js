import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const getPreviousMonths = (count = 6) => {
  const now = new Date();
  return Array.from({ length: count }, (_v, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { label, date, index };
  });
};

export default function PastAnalyticsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const mode = route.params?.mode || 'analytics';
  const cycleContext = route.params?.cycleContext;
  const months = useMemo(() => getPreviousMonths(6), []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => {
        if (mode === 'cycle') {
          navigation.navigate('PastCycleCalendar', {
            month: item.label,
            offset: item.index,
            cycleContext,
          });
        } else {
          navigation.navigate('PastAnalyticsDetail', { month: item.label, offset: item.index });
        }
      }}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardText}>{item.label}</Text>
        <View style={styles.cardIconBadge}>
          <Ionicons name="add" size={16} color="#4B117B" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={22} color="#4B117B" />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Past Analytics</Text>
        <FlatList
          data={months}
          keyExtractor={(item) => item.label}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E5DCF0',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFE7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3F2560',
    marginBottom: 18,
  },
  listContent: {
    paddingBottom: 32,
    paddingTop: 4,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    minHeight: 68,
    shadowColor: '#4B117B',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3F2560',
  },
  cardIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1E9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 0,
  },
});
