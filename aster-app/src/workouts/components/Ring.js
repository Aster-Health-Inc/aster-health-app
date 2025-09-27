import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function Ring({
  size = 88,
  stroke = 10,
  progress = 0,   // 0..1
  trackColor = '#ECECEC',
  fillColor = '#111111',
  label,
  valueText,
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size/2} cy={size/2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size/2}
          cy={size/2}
          r={r}
          stroke={fillColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </Svg>
      {valueText ? <Text style={{ position: 'absolute', fontWeight: '800' }}>{valueText}</Text> : null}
      {label ? <Text style={{ position: 'absolute', bottom: -18, fontSize: 12, color: '#6B7280' }}>{label}</Text> : null}
    </View>
  );
}