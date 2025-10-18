import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { BlurView } from 'expo-blur';

const COLORS = {
  barTint: 'rgba(255,255,255,0.55)',
  androidTint: 'rgba(255,255,255,0.78)',
  border: 'rgba(255,255,255,0.6)',
  activeText: '#111111',
  inactiveText: '#707178',
  activeFill: 'rgba(230,231,236,0.92)',
};

const DEFAULT_ITEMS = [
  {
    key: 'Home',
    label: 'Home',
    route: 'Home',
    renderIcon: (color) => <HomeIcon color={color} />,
  },
  {
    key: 'Food',
    label: 'Food',
    route: 'MealLogHome',
    renderIcon: (color) => (
      <MaterialCommunityIcons name="silverware-fork-knife" size={22} color={color} />
    ),
  },
  {
    key: 'Cycle',
    label: 'Cycle',
    route: 'CycleHome',
    renderIcon: (color, active) => <CycleIcon color={color} active={active} />,
  },
  {
    key: 'Workout',
    label: 'Workout',
    route: 'Workout',
    renderIcon: (color) => (
      <MaterialCommunityIcons name="run" size={22} color={color} />
    ),
  },
];

function BottomTaskbar({ activeKey, items = DEFAULT_ITEMS, style, onTabPress }) {
  const navigation = useNavigation();

  const renderedItems = useMemo(
    () =>
      items.map((item) => {
        const isActive = item.key === activeKey;
        const tint = isActive ? COLORS.activeText : COLORS.inactiveText;

        const handlePress = () => {
          if (onTabPress) {
            onTabPress(item);
          }
          if (item.onPress) {
            item.onPress();
            return;
          }
          if (item.route) {
            navigation.navigate(item.route);
          }
        };

        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.tab, isActive && styles.tabActive]}
            activeOpacity={0.85}
            onPress={handlePress}
          >
            {item.renderIcon(tint, isActive)}
            <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      }),
    [activeKey, items, navigation, onTabPress],
  );

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={55} tint="light" style={styles.bar}>
          {renderedItems}
        </BlurView>
      ) : (
        <View style={[styles.bar, styles.barAndroid]}>
          {renderedItems}
        </View>
      )}
    </View>
  );
}

export default memo(BottomTaskbar);

function HomeIcon({ color }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M4.5 10.2L12 4.5l7.5 5.7V19c0 .8-.7 1.5-1.5 1.5h-10c-.8 0-1.5-.7-1.5-1.5v-5.3"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M8.8 14.3c.7.9 1.8 1.4 3.2 1.4 1.4 0 2.5-.5 3.2-1.4"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function CycleIcon({ color, active }) {
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const progress = active ? 0.72 : 0.62;

  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle
        cx={12}
        cy={12}
        r={radius}
        stroke={color}
        opacity={0.18}
        strokeWidth={1.8}
        fill="none"
      />
      <Circle
        cx={12}
        cy={12}
        r={radius}
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeDasharray={`${circumference * progress} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '92%',
    borderRadius: 26,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: COLORS.barTint,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 6,
      },
    }),
  },
  barAndroid: {
    backgroundColor: COLORS.androidTint,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 18,
  },
  tabActive: {
    backgroundColor: COLORS.activeFill,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.inactiveText,
  },
  labelActive: {
    color: COLORS.activeText,
    fontWeight: '700',
  },
});
