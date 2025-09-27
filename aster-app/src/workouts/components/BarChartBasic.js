import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';

export default function BarChartBasic({ labels = [], values = [] }) {
  const width = 320, height = 180, pad = 24;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const max = Math.max(...values, 1);
  const barW = innerW / values.length - 10;

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12 }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <Line key={i} x1={pad} y1={pad + innerH * (1 - p)} x2={width - pad} y2={pad + innerH * (1 - p)} stroke="#E9ECEF" strokeWidth="1" />
        ))}
        {/* bars */}
        {values.map((v, i) => {
          const h = (v / max) * innerH;
          const x = pad + i * (innerW / values.length) + 5;
          const y = pad + (innerH - h);
          return <Rect key={i} x={x} y={y} width={barW} height={h} rx="4" ry="4" fill="#2F7D78" />;
        })}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 }}>
        {labels.map((l, i) => (
          <Text key={i} style={{ fontSize: 11, color: '#9AA0A6' }}>{l}</Text>
        ))}
      </View>
    </View>
  );
}
