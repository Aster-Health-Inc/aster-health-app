import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

const WIDTH = 320;
const HEIGHT = 210;
const PAD_TOP = 26;
const PAD_BOTTOM = 44;
const PAD_LEFT = 58;
const PAD_RIGHT = 18;
const INNER_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const INNER_H = HEIGHT - PAD_TOP - PAD_BOTTOM;
const TICKS = 4;

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const getExtents = (values) => {
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (let i = 0; i < values.length; i += 1) {
    const val = values[i];
    if (val < min) min = val;
    if (val > max) max = val;
  }
  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max) || max === 0) max = 1;
  if (min === max) min = 0;
  return { min, max };
};

const formatValue = (value) => {
  const rounded = Math.round(value);
  if (rounded >= 1000) {
    const scaled = (rounded / 1000).toFixed(1);
    return `${scaled.endsWith('.0') ? scaled.slice(0, -2) : scaled}k`;
  }
  return String(rounded);
};

export default function AreaChartBasic({ labels = [], values = [] }) {
  const numericValues = values.map(toNumber);
  const { min, max } = getExtents(numericValues);
  const denom = numericValues.length > 1 ? numericValues.length - 1 : 1;

  const points = numericValues.map((value, idx) => {
    const x = PAD_LEFT + (idx / denom) * INNER_W;
    const relative = (value - min) / (max - min || 1);
    const y = PAD_TOP + (1 - relative) * INNER_H;
    return [x, y];
  });
  const hasPoints = points.length > 0;
  const path = hasPoints
    ? points.reduce(
        (acc, [x, y], idx) => `${acc}${idx === 0 ? 'M' : ' L'} ${x} ${y}`,
        ''
      )
    : `M ${PAD_LEFT} ${PAD_TOP + INNER_H}`;
  const area = hasPoints
    ? `${path} L ${PAD_LEFT + INNER_W} ${PAD_TOP + INNER_H} L ${PAD_LEFT} ${PAD_TOP + INNER_H} Z`
    : `M ${PAD_LEFT} ${PAD_TOP + INNER_H} L ${PAD_LEFT + INNER_W} ${PAD_TOP + INNER_H}`;

  const peakIdx = numericValues.reduce(
    (acc, val, idx) => (val > numericValues[acc] ? idx : acc),
    0
  );
  const peakPoint = points[peakIdx] || [PAD_LEFT, PAD_TOP + INNER_H];
  const peakValue = numericValues[peakIdx] ?? 0;

  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => i / TICKS);

  return (
    <View style={styles.wrapper}>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#2F7D78" stopOpacity="0.28" />
            <Stop offset="100%" stopColor="#2F7D78" stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* grid & axis labels */}
        {ticks.map((t, idx) => {
          const y = PAD_TOP + INNER_H * (1 - t);
          const valueLabel = min + (max - min) * t;
          return (
            <React.Fragment key={idx}>
              <Line
                x1={PAD_LEFT}
                y1={y}
                x2={WIDTH - PAD_RIGHT}
                y2={y}
                stroke="#E2E5EA"
                strokeWidth={idx === 0 ? 1.4 : 1}
                strokeDasharray={idx === 0 ? undefined : '5 8'}
              />
              <SvgText
                x={PAD_LEFT - 12}
                y={y + 4}
                textAnchor="end"
                fill="#9AA0A6"
                fontSize="10"
                fontWeight="600"
              >
                {formatValue(valueLabel)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* area & line */}
        <Path d={area} fill="url(#areaFill)" />
        <Path d={path} stroke="#2F7D78" strokeWidth="2.5" fill="none" />

        {/* peak marker */}
        {numericValues.length ? (
          <>
            <Line
              x1={peakPoint[0]}
              y1={PAD_TOP}
              x2={peakPoint[0]}
              y2={PAD_TOP + INNER_H}
              stroke="#9FB3BD"
              strokeDasharray="4 6"
              strokeWidth="1.2"
            />
            <Circle
              cx={peakPoint[0]}
              cy={peakPoint[1]}
              r="6"
              fill="#2F7D78"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <Rect
              x={peakPoint[0] - 32}
              y={peakPoint[1] - 36}
              width="64"
              height="24"
              rx="10"
              fill="#2F7D78"
            />
            <SvgText
              x={peakPoint[0]}
              y={peakPoint[1] - 20}
              fill="#FFFFFF"
              fontSize="11"
              fontWeight="700"
              textAnchor="middle"
            >
              {formatValue(peakValue)}
            </SvgText>
          </>
        ) : null}

        {/* x-axis */}
        <Line
          x1={PAD_LEFT}
          y1={PAD_TOP + INNER_H}
          x2={WIDTH - PAD_RIGHT}
          y2={PAD_TOP + INNER_H}
          stroke="#C9CDD2"
          strokeWidth="1.4"
        />

        {/* x labels */}
        {labels.map((label, idx) => {
          const x = PAD_LEFT + (idx / Math.max(labels.length - 1, 1)) * INNER_W;
          return (
            <SvgText
              key={idx}
              x={x}
              y={HEIGHT - 18}
              textAnchor="middle"
              fill="#82888F"
              fontSize="11"
              fontWeight="600"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 18,
    backgroundColor: '#F8FAF9',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E7EBEF',
  },
});
