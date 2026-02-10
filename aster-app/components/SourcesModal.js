import React from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getHealthInsightSourceConfig } from '../data/healthInsightSources';

const SourcesModal = ({
  visible,
  onClose,
  categoryKey = 'general_wellness',
  title = 'Sources and Methodology',
  contextText,
  reminderText,
  sources,
}) => {
  const sourceConfig = getHealthInsightSourceConfig(categoryKey);
  const providedConfig = Array.isArray(sources)
    ? { sources }
    : (sources && typeof sources === 'object' ? sources : null);
  const resolvedContext = contextText || providedConfig?.context || sourceConfig.context;
  const resolvedMethodology = providedConfig?.methodology || sourceConfig.methodology;
  const resolvedReminder =
    reminderText ||
    providedConfig?.wellnessReminder ||
    sourceConfig.wellnessReminder ||
    'This content is for general wellness and educational purposes only.';
  const resolvedSources = providedConfig?.sources || sourceConfig.sources || [];

  const openLink = async (url) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.log('Open source URL failed', err);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button">
              <Ionicons name="close" size={18} color="#4B117B" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {resolvedContext ? <Text style={styles.sectionText}>{resolvedContext}</Text> : null}
            {resolvedMethodology ? <Text style={styles.sectionText}>{resolvedMethodology}</Text> : null}
            <Text style={styles.reminderText}>{resolvedReminder}</Text>

            <Text style={styles.sourcesHeading}>Sources</Text>
            {resolvedSources.map((source) => (
              <View key={`${source.title}-${source.url}`} style={styles.sourceRow}>
                <Text style={styles.bullet}>{'\u2022'}</Text>
                <View style={styles.sourceCopy}>
                  <Text style={styles.sourceTitle} onPress={() => openLink(source.url)}>
                    {source.title}
                  </Text>
                  {source.note ? <Text style={styles.sourceNote}>{source.note}</Text> : null}
                </View>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#2F1E57',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#3F2560',
    paddingRight: 10,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2ECFF',
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 4,
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#5F5478',
  },
  reminderText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: '#4B117B',
  },
  sourcesHeading: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#3F2560',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    marginTop: 1,
    marginRight: 8,
    fontSize: 15,
    color: '#4B117B',
  },
  sourceCopy: {
    flex: 1,
    gap: 2,
  },
  sourceTitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#3C2C8B',
    textDecorationLine: 'underline',
  },
  sourceNote: {
    fontSize: 12,
    lineHeight: 17,
    color: '#7D7396',
  },
});

export default SourcesModal;
