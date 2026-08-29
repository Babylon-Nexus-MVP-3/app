import { ReactNode, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useReduceMotion } from "@/lib/motion";

const KNOB = 50;

/**
 * Green wash that grows out of the control that triggered it to fill the
 * screen, then reveals its children on top.
 *
 * By default the circle starts at the slide-to-confirm knob's resting place —
 * bottom-right, inset to match the slider track — so the confirmation visually
 * continues the gesture that caused it rather than appearing from nowhere.
 * Screens confirmed by a full-width button pass `origin="button"` instead, so
 * the wash grows from the middle of that button for the same reason.
 */
export function SuccessReveal({
  children,
  origin = "knob",
}: {
  children: ReactNode;
  origin?: "knob" | "button";
}) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  // Big enough that the circle still covers the far corner once it's grown.
  const diameter = Math.max(width, height) * 2.4;
  const grow = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const contentIn = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.sequence([
      Animated.timing(grow, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentIn, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [grow, contentIn, reduceMotion]);

  // Where the knob ends up: right-hand side of the track, above the footer.
  // A full-width button has no travel, so its wash starts from its centre.
  const originX = origin === "button" ? width / 2 : width - 16 - KNOB / 2 - 4;
  const originY = height - 90;

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.circle,
          {
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            left: originX - diameter / 2,
            top: originY - diameter / 2,
            transform: [
              {
                scale: grow.interpolate({ inputRange: [0, 1], outputRange: [KNOB / diameter, 1] }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentIn,
            transform: [
              { translateY: contentIn.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

/** The white disc with a tick — the knob, arrived at its destination. */
export function SuccessTick() {
  const reduceMotion = useReduceMotion();
  const pop = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.spring(pop, {
      toValue: 1,
      delay: 380,
      useNativeDriver: true,
      bounciness: 10,
      speed: 12,
    }).start();
  }, [pop, reduceMotion]);

  return (
    <Animated.View style={[styles.tick, { transform: [{ scale: pop }] }]}>
      <Ionicons name="checkmark" size={40} color={Colors.vouchGreen} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.white },
  circle: { position: "absolute", backgroundColor: Colors.vouchGreen },
  content: { flex: 1 },
  tick: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
