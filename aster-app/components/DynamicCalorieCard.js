import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DynamicCalorieCard = ({
  caloriesConsumed = 100,
  caloriesGoal = 1522,
  toggleInterval = 3000
}) => {
  const [showLeft, setShowLeft] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const caloriesLeft = caloriesGoal - caloriesConsumed;
  const percentage = (caloriesConsumed / caloriesGoal) * 100;

  // Circle configuration
  const radius = 60;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

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
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.leftSection}>
          {showLeft ? (
            <>
              <Text style={styles.mainNumber}>{caloriesLeft}</Text>
              <Text style={styles.label}>Calories left</Text>
            </>
          ) : (
            <>
              <Text style={styles.mainNumber}>
                {caloriesConsumed}
                <Text style={styles.subNumber}> /{caloriesGoal}</Text>
              </Text>
              <Text style={styles.label}>Calories eaten</Text>
            </>
          )}
        </View>

        <View style={styles.rightSection}>
          <Svg width={radius * 2 + 20} height={radius * 2 + 20}>
            {/* Background circle */}
            <Circle
              cx={radius + 10}
              cy={radius + 10}
              r={radius}
              stroke="#EFEFEF"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress circle */}
            <Circle
              cx={radius + 10}
              cy={radius + 10}
              r={radius}
              stroke="#2F7D78"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${radius + 10} ${radius + 10})`}
            />
          </Svg>
          <View style={styles.centerIcon}>
            <Text style={styles.fireEmoji}>🔥</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
  },
  mainNumber: {
    fontSize: 56,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 4,
  },
  subNumber: {
    fontSize: 32,
    fontWeight: '400',
    color: '#8C8C8C',
  },
  label: {
    fontSize: 16,
    color: '#8C8C8C',
    fontWeight: '400',
  },
  rightSection: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
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
  fireEmoji: {
    fontSize: 32,
  },
});

export default DynamicCalorieCard;
