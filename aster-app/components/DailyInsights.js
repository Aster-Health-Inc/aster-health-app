import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getPhaseInfo } from '../utils/cycleCalculations';
import Disclaimer from './Disclaimer';
import InfoIcon from './InfoIcon';
import SourcesModal from './SourcesModal';

const DailyInsights = ({ cycleData, cyclePrediction }) => {
  const [activeSourcesKey, setActiveSourcesKey] = useState(null);

  if (!cycleData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Daily Insights</Text>
        <Text style={styles.noDataText}>
          Start tracking your cycle to get personalized daily insights
        </Text>
      </View>
    );
  }

  const phaseInfo = getPhaseInfo(cycleData.phase);
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
  const openSourcesModal = (categoryKey) => setActiveSourcesKey(categoryKey || 'cycle_phase_patterns');
  const closeSourcesModal = () => setActiveSourcesKey(null);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Today's Wellness Insights</Text>
        <InfoIcon onPress={() => openSourcesModal('cycle_phase_patterns')} />
      </View>
      <Text style={styles.date}>{today}</Text>
      
      <View style={[styles.phaseCard, { borderLeftColor: phaseInfo.color }]}>
        <View style={styles.phaseHeader}>
          <Text style={styles.phaseEmoji}>{phaseInfo.emoji}</Text>
          <Text style={styles.phaseName}>{phaseInfo.name} Phase</Text>
          <InfoIcon tint={phaseInfo.color} onPress={() => openSourcesModal('cycle_phase_patterns')} />
        </View>
        <Text style={styles.phaseDescription}>{phaseInfo.description}</Text>
      </View>

      <View style={styles.hormonalInsight}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Cycle Pattern Snapshot</Text>
          <InfoIcon onPress={() => openSourcesModal('cycle_phase_patterns')} />
        </View>
        <View style={styles.hormoneRow}>
          <Text style={styles.hormoneLabel}>Estrogen:</Text>
          <Text style={styles.hormoneValue}>{phaseInfo.hormones.estrogen}</Text>
        </View>
        <View style={styles.hormoneRow}>
          <Text style={styles.hormoneLabel}>Progesterone:</Text>
          <Text style={styles.hormoneValue}>{phaseInfo.hormones.progesterone}</Text>
        </View>
        <View style={styles.hormoneRow}>
          <Text style={styles.hormoneLabel}>Mood Energy:</Text>
          <Text style={styles.hormoneValue}>{phaseInfo.hormones.mood}</Text>
        </View>
      </View>

      <View style={styles.tipsSection}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Phase-Based Wellness Tips</Text>
          <InfoIcon onPress={() => openSourcesModal('cycle_phase_patterns')} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {phaseInfo.tips.map((tip, index) => (
            <View key={index} style={[styles.tipCard, { backgroundColor: phaseInfo.color + '20' }]}>
              <Text style={[styles.tipText, { color: phaseInfo.color }]}>{tip}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {cyclePrediction && (
        <View style={styles.predictionSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Cycle Estimates</Text>
            <InfoIcon onPress={() => openSourcesModal('cycle_estimates')} />
          </View>
          <View style={styles.predictionCard}>
            <Text style={styles.predictionLabel}>Next Period Estimate:</Text>
            <Text style={styles.predictionDate}>
              {new Date(cyclePrediction.predicted_period_date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric'
              })}
            </Text>
            <Text style={styles.confidence}>
              {Math.round(cyclePrediction.confidence_score * 100)}% estimate confidence
            </Text>
          </View>
        </View>
      )}
      <Disclaimer compact style={styles.disclaimerFooter} />
      <SourcesModal
        visible={Boolean(activeSourcesKey)}
        onClose={closeSourcesModal}
        categoryKey={activeSourcesKey || 'cycle_phase_patterns'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  phaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  phaseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  phaseDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  hormonalInsight: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hormoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  hormoneLabel: {
    fontSize: 14,
    color: '#666',
  },
  hormoneValue: {
    fontSize: 14,
    color: '#e91e63',
    fontWeight: '500',
  },
  tipsSection: {
    marginTop: 10,
  },
  tipCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
    minWidth: 160,
  },
  tipText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  predictionSection: {
    marginTop: 15,
  },
  predictionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  predictionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  predictionDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e91e63',
    marginBottom: 4,
  },
  confidence: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  disclaimerFooter: {
    marginTop: 16,
  },
});

export default DailyInsights;
