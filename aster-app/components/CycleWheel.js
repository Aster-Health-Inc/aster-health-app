import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getPhaseInfo } from '../utils/cycleCalculations';

const CycleWheel = ({ cycleData }) => {
  if (!cycleData) {
    return (
      <View style={styles.container}>
        <View style={styles.wheel}>
          <Text style={styles.centerText}>Track your first period to see your cycle</Text>
        </View>
      </View>
    );
  }

  const phaseInfo = getPhaseInfo(cycleData.phase);
  const circumference = 2 * Math.PI * 80; // radius = 80
  const strokeDasharray = `${(cycleData.progress / 100) * circumference} ${circumference}`;

  return (
    <View style={styles.container}>
      <View style={styles.wheel}>
        <View style={[styles.progressRing, { borderColor: phaseInfo.color }]}>
          <View style={styles.progressFill} />
        </View>
        
        <View style={styles.centerContent}>
          <Text style={styles.phaseEmoji}>{phaseInfo.emoji}</Text>
          <Text style={styles.phaseName}>{phaseInfo.name}</Text>
          <Text style={styles.cycleDay}>Day {cycleData.currentCycleDay}</Text>
          <Text style={styles.phaseDay}>Phase Day {cycleData.phaseDay}</Text>
        </View>
        
        <View style={styles.progressIndicator}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${cycleData.progress}%`,
                backgroundColor: phaseInfo.color 
              }
            ]} 
          />
        </View>
      </View>
      
      <View style={styles.nextPhaseContainer}>
        <Text style={styles.nextPhaseText}>
          {cycleData.daysUntilNext} days until {cycleData.nextPhase}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  wheel: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 3,
    borderColor: '#e91e63',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  progressRing: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 4,
    borderColor: '#f0f0f0',
  },
  progressFill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 95,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  phaseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cycleDay: {
    fontSize: 16,
    color: '#e91e63',
    fontWeight: '500',
    marginBottom: 2,
  },
  phaseDay: {
    fontSize: 12,
    color: '#666',
  },
  progressIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  nextPhaseContainer: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(233, 30, 99, 0.3)',
  },
  nextPhaseText: {
    color: '#e91e63',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default CycleWheel;