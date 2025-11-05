import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SvgXml } from 'react-native-svg';
import { BlurView } from 'expo-blur';

const COLORS = {
  glassBottom: 'rgba(248,247,255,0.88)',
  border: 'rgba(223,219,243,0.9)',
  shadow: 'rgba(92,75,140,0.12)',
  activeLabel: '#111111',
  inactiveLabel: '#55535F',
  activeFill: '#E8E8EF',
  purpleStart: '#4B117B',
  purpleEnd: '#891FE1',
};

const ICONS = {
  home: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.12602 14C8.57006 15.7252 10.1362 17 12 17C13.8638 17 15.4299 15.7252 15.874 14M11.0177 2.764L4.23539 8.03912C3.78202 8.39175 3.55534 8.56806 3.39203 8.78886C3.24737 8.98444 3.1396 9.20478 3.07403 9.43905C3 9.70352 3 9.9907 3 10.5651V17.8C3 18.9201 3 19.4801 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4801 21 18.9201 21 17.8V10.5651C21 9.9907 21 9.70352 20.926 9.43905C20.8604 9.20478 20.7526 8.98444 20.608 8.78886C20.4447 8.56806 20.218 8.39175 19.7646 8.03913L12.9823 2.764C12.631 2.49075 12.4553 2.35412 12.2613 2.3016C12.0902 2.25526 11.9098 2.25526 11.7387 2.3016C11.5447 2.35412 11.369 2.49075 11.0177 2.764Z" stroke="#404040" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  cycle: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24.002 12C24.002 18.6274 18.6294 24 12.002 24C5.37454 24 0.00195312 18.6274 0.00195312 12C0.00195312 5.37258 5.37454 0 12.002 0C18.6294 0 24.002 5.37258 24.002 12ZM2.30169 12C2.30169 17.3573 6.64465 21.7003 12.002 21.7003C17.3593 21.7003 21.7022 17.3573 21.7022 12C21.7022 6.64269 17.3593 2.29974 12.002 2.29974C6.64465 2.29974 2.30169 6.64269 2.30169 12Z" fill="#767680" fill-opacity="0.05"/>
    <path d="M11.9701 22.6682C11.9701 23.3707 11.399 23.9471 10.7005 23.8726C8.78192 23.668 6.93454 23.0017 5.31986 21.9228C3.35139 20.6075 1.81715 18.7381 0.911167 16.5508C0.00518085 14.3636 -0.231866 11.9568 0.230002 9.63483C0.69187 7.31286 1.83191 5.18 3.50595 3.50595C5.18 1.83191 7.31286 0.691869 9.63483 0.230001C11.9568 -0.231866 14.3636 0.00518137 16.5508 0.911168C18.7381 1.81716 20.6075 3.35139 21.9228 5.31986C23.0017 6.93455 23.668 8.78192 23.8726 10.7005C23.9471 11.399 23.3707 11.9701 22.6682 11.9701C21.9657 11.9701 21.405 11.398 21.3105 10.7019C21.1185 9.28746 20.6068 7.92927 19.8076 6.73321C18.7719 5.18309 17.2997 3.97492 15.5773 3.26148C13.8549 2.54804 11.9596 2.36137 10.1311 2.72508C8.30264 3.08879 6.62307 3.98654 5.3048 5.3048C3.98654 6.62307 3.08879 8.30264 2.72508 10.1311C2.36137 11.9596 2.54804 13.8549 3.26148 15.5773C3.97492 17.2997 5.18309 18.7719 6.7332 19.8076C7.92927 20.6068 9.28746 21.1185 10.7019 21.3105C11.398 21.405 11.9701 21.9657 11.9701 22.6682Z" fill="#404040"/>
  </svg>`,
  chat: `<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.14258 20.3904C3.14258 15.5518 5.12931 10.9114 8.66571 7.49C12.2021 4.0686 16.9985 2.14648 21.9997 2.14648C27.0009 2.14648 31.7973 4.0686 35.3337 7.49C38.8701 10.9114 40.8569 15.5518 40.8569 20.3904V31.9981C40.8569 33.9319 40.8569 34.8943 40.5599 35.6674C40.3237 36.28 39.9542 36.8363 39.4763 37.2986C38.9984 37.7609 38.4234 38.1185 37.7902 38.3469C36.9911 38.6343 35.9941 38.6343 33.9976 38.6343H21.9997C16.9985 38.6343 12.2021 36.7122 8.66571 33.2908C5.12931 29.8694 3.14258 25.229 3.14258 20.3904Z" stroke="url(#paint0_linear)" stroke-width="3"/>
    <path d="M15.1465 17.073H28.9554M22.0509 25.7813H28.9554" stroke="url(#paint1_linear)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <defs>
      <linearGradient id="paint0_linear" x1="21.9997" y1="2.14648" x2="21.9997" y2="38.6343" gradientUnits="userSpaceOnUse">
        <stop stop-color="#4B117B"/>
        <stop offset="1" stop-color="#891FE1"/>
      </linearGradient>
      <linearGradient id="paint1_linear" x1="22.0509" y1="17.073" x2="22.0509" y2="25.7813" gradientUnits="userSpaceOnUse">
        <stop stop-color="#4B117B"/>
        <stop offset="1" stop-color="#891FE1"/>
      </linearGradient>
    </defs>
  </svg>`,
  food: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 2V22M4 2.5V7.5C4 10 7 10 7 10C7 10 10 10 10 7.5V2.5M17 10V22M17 10C18.657 10 20 8.209 20 6C20 3.791 18.657 2 17 2C15.343 2 14 3.791 14 6C14 8.209 15.343 10 17 10Z" stroke="#404040" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  workout: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 21L14.336 18.384C14.1152 17.5154 13.6603 16.7241 13.021 16.096L11.5 14.6M6 11.153C7 9.183 8.538 8.04 12 8M12 8C12.219 7.997 12.544 7.996 12.87 7.996C13.375 7.996 13.627 7.996 13.828 8.09C14.029 8.184 14.236 8.43 14.648 8.924C14.766 9.064 14.888 9.191 15 9.276M12 8L10.73 9.958C10.033 11.034 9.684 11.573 9.67 12.138C9.66409 12.3899 9.70582 12.6406 9.793 12.877C9.988 13.407 10.493 13.804 11.5 14.598M20 8.198C17.963 10.491 16.155 10.143 15 9.277L11.5 14.599M4 17.73L4.678 17.892C6.407 18.302 8.203 17.516 9 16M17 4.5C17 4.89782 16.842 5.27936 16.5607 5.56066C16.2794 5.84196 15.8978 6 15.5 6C15.1022 6 14.7206 5.84196 14.4393 5.56066C14.158 5.27936 14 4.89782 14 4.5C14 4.10218 14.158 3.72064 14.4393 3.43934C14.7206 3.15804 15.1022 3 15.5 3C15.8978 3 16.2794 3.15804 16.5607 3.43934C16.842 3.72064 17 4.10218 17 4.5Z" stroke="#404040" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
};

const DEFAULT_ITEMS = [
  { key: 'Home', label: 'Home', route: 'Home', icon: ICONS.home },
  { key: 'Cycle', label: 'Cycle', route: 'CycleHome', icon: ICONS.cycle },
  { key: 'Chat', label: '', route: 'Home', isCenter: true, icon: ICONS.chat },
  { key: 'Food', label: 'Food', route: 'MealLogHome', icon: ICONS.food },
  { key: 'Workout', label: 'Workout', route: 'Workout', icon: ICONS.workout },
];

function BottomTaskbar({ activeKey, items = DEFAULT_ITEMS, style, onTabPress }) {
  const navigation = useNavigation();

  const renderedItems = useMemo(
    () =>
      items.map((item) => {
        const isActive = item.key === activeKey;
        const isCenter = Boolean(item.isCenter);

        const handlePress = () => {
          if (onTabPress) onTabPress(item);
          if (item.onPress) {
            item.onPress();
            return;
          }
          if (!item.route) return;
          if (item.key === 'Chat') {
            navigation.navigate('Home', { openChatbot: Date.now() });
          } else {
            navigation.navigate(item.route);
          }
        };

        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.tab,
              isActive && !isCenter && styles.tabActive,
              isCenter && styles.centerTab,
            ]}
            activeOpacity={0.9}
            onPress={handlePress}
          >
            <View
              style={[
                styles.iconWrap,
                isCenter && styles.iconWrapCenter,
              ]}
            >
              <SvgXml xml={item.icon} width={isCenter ? 32 : 24} height={isCenter ? 32 : 24} />
            </View>
            {item.label ? (
              <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
            ) : null}
          </TouchableOpacity>
        );
      }),
    [activeKey, items, navigation, onTabPress],
  );

  const GlassComponent = Platform.OS === 'ios' ? BlurView : View;
  const glassProps = Platform.OS === 'ios' ? { intensity: 20, tint: 'light' } : {};

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, style]}>
      <GlassComponent
        {...glassProps}
        style={[styles.bar, Platform.OS === 'android' && styles.barAndroid]}
      >
        {renderedItems}
      </GlassComponent>
    </View>
  );
}

export default memo(BottomTaskbar);

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
    width: '86%',
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderColor: COLORS.border,
    borderWidth: 1,
    gap: 6,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : COLORS.glassBottom,
    shadowColor: COLORS.shadow,
    shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0.16,
    shadowRadius: Platform.OS === 'ios' ? 16 : 12,
    shadowOffset: { width: 0, height: 10 },
  },
  barAndroid: {
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: COLORS.activeFill,
  },
  centerTab: {
    flex: 1,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
    color: COLORS.inactiveLabel,
  },
  labelActive: {
    color: COLORS.activeLabel,
    fontWeight: '700',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapCenter: {
    width: 34,
    height: 34,
    borderRadius: 17,


    alignItems: 'center',
    justifyContent: 'center',

  },
});
