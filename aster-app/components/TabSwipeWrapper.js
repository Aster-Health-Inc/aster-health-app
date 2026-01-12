import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

const TAB_ORDER = ['Home', 'Cycle', 'Food'];
const ROUTE_MAP = {
  Home: 'Home',
  Cycle: 'CycleHome',
  Food: 'FoodLog',
};

const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY = 800;

const TabSwipeWrapper = ({ activeKey, children, enabled = true }) => {
  const navigation = useNavigation();
  const activeIndex = useMemo(
    () => TAB_ORDER.indexOf(activeKey),
    [activeKey],
  );

  const handleSwipeEnd = (event) => {
    if (!enabled || activeIndex < 0) return;
    const { state, translationX, velocityX } = event.nativeEvent;
    if (state !== State.END) return;

    const absTranslation = Math.abs(translationX);
    const absVelocity = Math.abs(velocityX);
    if (absTranslation < SWIPE_THRESHOLD && absVelocity < SWIPE_VELOCITY) {
      return;
    }

    const direction = translationX > 0 ? 'rtl' : 'ltr';
    const nextIndex = direction === 'rtl' ? activeIndex - 1 : activeIndex + 1;
    if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) return;

    const nextKey = TAB_ORDER[nextIndex];
    const route = ROUTE_MAP[nextKey];
    if (!route) return;

    navigation.navigate(route, {
      tabTransition: {
        from: activeKey,
        to: nextKey,
        fromIndex: activeIndex,
        toIndex: nextIndex,
        direction,
      },
    });
  };

  if (activeIndex < 0) {
    return <>{children}</>;
  }

  return (
    <PanGestureHandler
      onHandlerStateChange={handleSwipeEnd}
      activeOffsetX={[-40, 40]}
      failOffsetY={[-20, 20]}
    >
      <View style={styles.container}>{children}</View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TabSwipeWrapper;
