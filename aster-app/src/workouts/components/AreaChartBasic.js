import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Line, Circle, Rect } from 'react-native-svg';

export default function AreaChartBasic({ labels = [], values = [] }) {
  const width = 320, height = 200, pad = 28;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const max = Math.max(...values, 1), min = Math.min(...values, 0);

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW;
    const y = pad + (1 - (v - min) / (max - min || 1)) * innerH;
    return [x, y];
  });

  const path = points.reduce((acc, [x, y], i) => acc + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`), '');
  const area = `${path} L ${pad + innerW} ${pad + innerH} L ${pad} ${pad + innerH} Z`;

  const peakIdx = values.indexOf(Math.max(...values));
  const [px, py] = points[peakIdx] || [pad, pad];

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12 }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <Line key={i} x1={pad} y1={pad + innerH * (1 - p)} x2={width - pad} y2={pad + innerH * (1 - p)} stroke="#E9ECEF" strokeWidth="1" />
        ))}

        {/* area fill */}
        <Path d={area} fill="#2F7D78" opacity="0.18" />
        {/* line */}
        <Path d={path} stroke="#2F7D78" strokeWidth="2.5" fill="none" />

        {/* peak marker + vertical line */}
        <Line x1={px} y1={pad} x2={px} y2={pad + innerH} stroke="#9AA0A6" strokeDasharray="3 4" />
        <Circle cx={px} cy={py} r="5" fill="#2F7D78" stroke="#FFFFFF" strokeWidth="2" />

        {/* value tag */}
        <Rect x={px - 20} y={py - 26} width="40" height="18" rx="6" fill="#2F7D78" />
        <TextSvg x={px} y={py - 13} textAnchor="middle" fill="#FFFFFF" fontSize="10">
          {Math.round(values[peakIdx] ?? 0)}
        </TextSvg>
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 }}>
        {labels.map((l, i) => <Text key={i} style={{ fontSize: 11, color: '#9AA0A6' }}>{l}</Text>)}
      </View>
    </View>
  );
}

// tiny helper so RN recognizes <Text> inside SVG in plain JS
function TextSvg(props) {
  return <Text {...props} />;
}
