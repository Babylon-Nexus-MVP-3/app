import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

/**
 * Respect the OS "reduce motion" setting. When it's on, callers should start
 * their animations already settled rather than moving — motion sensitivity is
 * common among our users, and the app must stay usable without animation.
 */
export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (active) setReduceMotion(on);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return reduceMotion;
}

/**
 * Fade + rise on mount, staggered by `delay` (ms). Native-driven, so it runs
 * off the JS thread. Spread the result onto an Animated.View's style.
 */
export function useEntrance(delay = 0, reduceMotion = false) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(1);
      return;
    }
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [anim, delay, reduceMotion]);

  return {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };
}

/** Stagger step between successive list items, in ms. */
export const STAGGER = 70;

/**
 * Press-scale spring for tappable cards and rows. Returns the animated scale
 * plus the two handlers to wire to a Touchable.
 */
export function usePressScale(reduceMotion = false, scaleTo = 0.972) {
  const press = useRef(new Animated.Value(0)).current;

  function springTo(toValue: number) {
    if (reduceMotion) return;
    Animated.spring(press, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: toValue === 0 ? 8 : 0,
    }).start();
  }

  return {
    scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] }),
    onPressIn: () => springTo(1),
    onPressOut: () => springTo(0),
  };
}
