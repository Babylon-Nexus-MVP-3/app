import type { ReactNode } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { Colors } from "@/constants/colors";

type Tint = "light" | "dark" | "default";

type Props = {
  intensity?: number;
  tint?: Tint;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: "none" | "auto" | "box-none" | "box-only";
  /**
   * Set this when the blur renders inside a React Native `<Modal>`. An Android
   * modal is its own window, so a blur inside it can only sample the modal's
   * (empty) content — never the screen underneath — and comes out completely
   * flat. Those cases get a scrim instead. Anywhere else on Android the blur
   * is real.
   */
  inModal?: boolean;
  /** Override the Android scrim colour used when `inModal` is set. */
  fallbackColor?: string;
  children?: ReactNode;
};

function scrimFor(tint: Tint) {
  if (tint === "light") return Colors.scrimLight;
  if (tint === "dark") return Colors.scrimDark;
  return Colors.overlay;
}

/**
 * The app's only blur. Use this instead of `BlurView` directly so the Android
 * behaviour stays in one place.
 */
export function AppBlur({
  intensity = 40,
  tint = "dark",
  style,
  pointerEvents,
  inModal = false,
  fallbackColor,
  children,
}: Props) {
  if (Platform.OS === "android" && inModal) {
    return (
      <View
        pointerEvents={pointerEvents}
        style={[style, { backgroundColor: fallbackColor ?? scrimFor(tint) }]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      // Android's default blur method is "none" — expo-blur renders a flat
      // translucent rectangle and nothing else. "dimezisBlurView" is what
      // actually blurs. Note it samples the whole enclosing screen, not just
      // what sits behind this view, so anything drawn on top of the blur gets
      // pulled into it — keep these small and never full-screen.
      experimentalBlurMethod="dimezisBlurView"
      pointerEvents={pointerEvents}
      style={style}
    >
      {children}
    </BlurView>
  );
}
