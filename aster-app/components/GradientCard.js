import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function GradientCard({
  width = '100%',
  height = 200,
  borderRadius = 28,
  gradient = ['#BFAEFF', '#F2D3C7'],
  style,
  children,
}) {
  return (
    <View style={[{ width, borderRadius }, style]}>
      <Svg width="100%" height={height}>
        <Defs>
          <LinearGradient id="gradientCard" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradient[0]} />
            <Stop offset="100%" stopColor={gradient[1]} />
          </LinearGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx={borderRadius}
          fill="url(#gradientCard)"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.children]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  children: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
