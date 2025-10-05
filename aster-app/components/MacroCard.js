import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const MacroCard = ({
  type = 'Protein',
  consumed = 12,
  goal = 76,
  emoji = '🍗',
  color = '#ff6b6b',
  toggleInterval = 3000
}) => {
  const [showLeft, setShowLeft] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const left = goal - consumed;
  const percentage = (consumed / goal) * 100;
  const radius = 35;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

  const labels = {
    'Protein': 'Protein',
    'Carbs': 'Carbs',
    'Fat': 'Fats'
  };

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Toggle state
        setShowLeft(prev => !prev);

        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, toggleInterval);

    return () => clearInterval(interval);
  }, [toggleInterval]);

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
        {showLeft ? (
          <>
            <Text style={styles.mainNumber}>{left}g</Text>
            <Text style={styles.label}>{labels[type]} left</Text>
          </>
        ) : (
          <>
            <Text style={styles.mainNumber}>
              {consumed}
              <Text style={styles.subNumber}> /{goal}g</Text>
            </Text>
            <Text style={styles.label}>{labels[type]} </Text>
          </>
        )}
      </Animated.View>

      <View style={styles.circleContainer}>
        <Svg width={radius * 2 + 10} height={radius * 2 + 10}>
          {/* Background circle */}
          <Circle
            cx={radius + 5}
            cy={radius + 5}
            r={radius}
            stroke="#EFEFEF"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={radius + 5}
            cy={radius + 5}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${radius + 5} ${radius + 5})`}
          />
        </Svg>
        <View style={styles.centerIcon}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flex: 1,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  textContainer: {
    minHeight: 58,
    justifyContent: 'flex-start',
  },
  mainNumber: {
    fontSize: 25,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 2,
  },
  subNumber: {
    fontSize: 16,
    fontWeight: '400',
    color: '#8C8C8C',
  },
  label: {
    fontSize: 13,
    color: '#8C8C8C',
    marginBottom: 16,
  },
  circleContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  centerIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
  },
});

export default MacroCard;
