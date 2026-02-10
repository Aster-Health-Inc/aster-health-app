import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

const InfoIcon = ({
  onPress,
  size = 18,
  color = '#7A7A7A',
  tint,
  style,
  accessibilityLabel = 'Sources and Methodology',
}) => {
  const iconColor = tint || color;
  const hitTargetSize = Math.max(34, size + 14);
  const center = size / 2;
  const outerRadius = Math.max(1, center - 1.5);
  const lineTop = size * 0.43;
  const lineBottom = size * 0.66;
  const dotRadius = Math.max(0.9, size * 0.07);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.82}
      onPress={onPress}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      style={[
        styles.touchTarget,
        { width: hitTargetSize, height: hitTargetSize, borderRadius: hitTargetSize / 2 },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={center}
          cy={center}
          r={outerRadius}
          stroke={iconColor}
          strokeWidth={1.5}
          fill="none"
        />
        <Circle cx={center} cy={size * 0.3} r={dotRadius} fill={iconColor} />
        <Line
          x1={center}
          y1={lineTop}
          x2={center}
          y2={lineBottom}
          stroke={iconColor}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </Svg>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchTarget: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default InfoIcon;
