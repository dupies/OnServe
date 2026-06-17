import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';

export const hapticFeedback = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  selection: () => Haptics.selectionAsync(),
};

export const springAnimation = {
  config: { damping: 10, mass: 1, stiffness: 100, overshootClamping: false },
};

export function useSpringAnimation(initialValue: number = 0) {
  const animatedValue = useSharedValue(initialValue);

  const animate = (targetValue: number) => {
    animatedValue.value = withSpring(
      targetValue,
      springAnimation.config
    );
  };

  return { animatedValue, animate };
}
