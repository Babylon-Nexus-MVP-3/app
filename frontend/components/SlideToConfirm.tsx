import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";

const TRACK_HEIGHT = 58;
const KNOB = 50;
const KNOB_INSET = 4;
/** Fraction of the track that must be crossed before it counts as confirmed. */
const COMMIT_AT = 0.75;

/**
 * Slide-to-confirm. Used where an action is deliberate and hard to undo —
 * vouching puts the user's name behind someone else's work, so it shouldn't be
 * possible to fire it with a stray tap.
 *
 * Falls back to a plain button when a screen reader is on: dragging isn't a
 * reasonable thing to ask of VoiceOver or TalkBack users.
 */
export function SlideToConfirm({
  label,
  confirmingLabel = "Sending…",
  onConfirm,
  disabled = false,
  busy = false,
  accessibilityLabel,
}: {
  label: string;
  confirmingLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  busy?: boolean;
  accessibilityLabel?: string;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [screenReader, setScreenReader] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  // Latest values, so the gesture handlers don't capture stale state.
  const maxSlide = Math.max(trackWidth - KNOB - KNOB_INSET * 2, 0);
  const maxSlideRef = useRef(0);
  const lockedRef = useRef(false);
  maxSlideRef.current = maxSlide;

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (active) setScreenReader(on);
    });
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReader);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  // Reset the knob when the action finishes or becomes available again.
  useEffect(() => {
    if (!busy) {
      lockedRef.current = false;
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    }
  }, [busy, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !lockedRef.current,
      onMoveShouldSetPanResponder: (_, g) => !lockedRef.current && Math.abs(g.dx) > 2,
      onPanResponderMove: (_, g) => {
        if (lockedRef.current) return;
        const x = Math.min(Math.max(g.dx, 0), maxSlideRef.current);
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, g) => {
        if (lockedRef.current) return;
        const max = maxSlideRef.current;
        const x = Math.min(Math.max(g.dx, 0), max);
        if (max > 0 && x >= max * COMMIT_AT) {
          lockedRef.current = true;
          Animated.timing(translateX, {
            toValue: max,
            duration: 120,
            useNativeDriver: true,
          }).start(() => onConfirmRef.current());
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  // Keep the callback current without rebuilding the PanResponder.
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  function onLayout(e: LayoutChangeEvent) {
    setTrackWidth(e.nativeEvent.layout.width);
  }

  // Label fades out as the knob travels, so it never sits under the thumb.
  const labelOpacity = translateX.interpolate({
    inputRange: [0, Math.max(maxSlide * 0.6, 1)],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  // Starts at zero width: giving it the knob's width at rest painted a lighter
  // green patch behind the knob, which read as a mismatched background against
  // the rest of the track.
  const fillWidth = translateX.interpolate({
    inputRange: [0, Math.max(maxSlide, 1)],
    outputRange: [0, Math.max(trackWidth, 1)],
    extrapolate: "clamp",
  });

  if (screenReader) {
    return (
      <TouchableOpacity
        style={[styles.track, styles.buttonFallback, disabled && styles.disabled]}
        onPress={onConfirm}
        disabled={disabled || busy}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: disabled || busy }}
      >
        <AppText style={styles.fallbackText}>{busy ? confirmingLabel : label}</AppText>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.track, disabled && styles.disabled]}
      onLayout={onLayout}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint="Slide right to confirm"
    >
      <Animated.View style={[styles.fill, { width: fillWidth }]} />

      <Animated.View style={[styles.labelWrap, { opacity: labelOpacity }]} pointerEvents="none">
        <AppText style={styles.label}>{busy ? confirmingLabel : label}</AppText>
        <Ionicons name="chevron-forward" size={15} color={Colors.white} style={styles.chevron} />
        <Ionicons
          name="chevron-forward"
          size={15}
          color={Colors.white}
          style={styles.chevronFaint}
        />
      </Animated.View>

      <Animated.View
        style={[styles.knob, { transform: [{ translateX }] }]}
        {...(disabled || busy ? {} : panResponder.panHandlers)}
      >
        <Ionicons name={busy ? "checkmark" : "arrow-forward"} size={22} color={Colors.vouchGreen} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: Colors.vouchGreen,
    justifyContent: "center",
    overflow: "hidden",
  },
  disabled: { opacity: 0.4 },
  // Lightens behind the knob as it travels, so progress is visible.
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.vouchGreenMid,
  },
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: KNOB,
    gap: 2,
  },
  label: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.white },
  chevron: { opacity: 0.9, marginLeft: 6 },
  chevronFaint: { opacity: 0.45, marginLeft: -9 },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: KNOB_INSET,
  },
  buttonFallback: { alignItems: "center" },
  fallbackText: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.white },
});
