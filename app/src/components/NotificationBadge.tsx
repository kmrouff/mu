import React, { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/tokens';

export function NotificationBadge({ visible }: { visible: boolean }) {
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 300 : 200,
      easing: visible ? Easing.bezier(0.34, 1.56, 0.64, 1) : Easing.inOut(Easing.ease),
    });
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: -1,
          right: 2,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: colors.badge,
          borderWidth: 2,
          borderColor: colors.bg,
          shadowColor: colors.badge,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 3,
        },
        style,
      ]}
    />
  );
}
