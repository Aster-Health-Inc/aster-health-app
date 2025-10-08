import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Rect,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

const WIDTH = 320;
const HEIGHT = 200;
const PAD_TOP = 24;
const PAD_BOTTOM = 40;
const PAD_LEFT = 58;
const PAD_RIGHT = 18;
const INNER_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const INNER_H = HEIGHT - PAD_TOP - PAD_BOTTOM;
const TICKS = 4;

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const findMax = (values) => {
  let max = 0;
  for (let i = 0; i < values.length; i += 1) {
    const val = values[i];
    if (val > max) max = val;
  }
  return max;
};

const formatValue = (value) => {
  const rounded = Math.round(value);
  if (rounded >= 1000) {
    const scaled = (rounded / 1000).toFixed(1);
    return `${scaled.endsWith('.0') ? scaled.slice(0, -2) : scaled}k`;
  }
  return String(rounded);
};

export default function BarChartBasic({ labels = [], values = [] }) {
  const numericValues = values.map(toNumber);
  const maxValue = numericValues.length ? findMax(numericValues) : 0;
  const safeMax = maxValue > 0 ? maxValue : 1;
  const slots = numericValues.length || 1;
  const slotWidth = INNER_W / slots;
  const barWidth = slotWidth * 0.54;
  const peakIdx = numericValues.reduce(
    (acc, val, idx) => (val > numericValues[acc] ? idx : acc),
    0
  );
  const peakValue = numericValues[peakIdx] ?? 0;

  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => i / TICKS);

  return (
    <View style={styles.wrapper}>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Defs>
          <LinearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#2F7D78" stopOpacity="0.92" />
            <Stop offset="100%" stopColor="#2F7D78" stopOpacity="0.2" />
          </LinearGradient>
        </Defs>

        {/* horizontal grid + axis labels */}
        {ticks.map((t, idx) => {
          const y = PAD_TOP + INNER_H * (1 - t);
          const valueLabel = formatValue(safeMax * t);
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
                {valueLabel}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* bars */}
        {numericValues.map((val, idx) => {
          const height = (val / safeMax) * INNER_H;
          const x = PAD_LEFT + idx * slotWidth + (slotWidth - barWidth) / 2;
          const y = PAD_TOP + INNER_H - height;

          return (
            <Rect
              key={idx}
              x={x}
              y={y}
              width={barWidth}
              height={height}
              rx={barWidth / 3}
              fill="url(#barFill)"
            />
          );
        })}

        {/* peak indicator */}
        {numericValues.length ? (
          (() => {
            const peakHeight = (peakValue / safeMax) * INNER_H;
            const peakX =
              PAD_LEFT +
              peakIdx * slotWidth +
              (slotWidth - barWidth) / 2 +
              barWidth / 2;
            const peakY = PAD_TOP + INNER_H - peakHeight;
            return (
              <>
                <Line
                  x1={peakX}
                  y1={PAD_TOP}
                  x2={peakX}
                  y2={PAD_TOP + INNER_H}
                  stroke="#9FB3BD"
                  strokeDasharray="4 6"
                  strokeWidth="1.2"
                />
                <Rect
                  x={peakX - 28}
                  y={peakY - 34}
                  width="56"
                  height="22"
                  rx="10"
                  fill="#2F7D78"
                />
                <SvgText
                  x={peakX}
                  y={peakY - 19}
                  fill="#FFFFFF"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {formatValue(peakValue)}
                </SvgText>
              </>
            );
          })()
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
          const x = PAD_LEFT + idx * slotWidth + slotWidth / 2;
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
