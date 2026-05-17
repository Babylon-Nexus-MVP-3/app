import { Text, TextProps } from "react-native";
import { Fonts } from "@/constants/fonts";

type FontWeight = keyof typeof Fonts;

interface AppTextProps extends TextProps {
  weight?: FontWeight;
}

export function AppText({
  weight = "regular",
  style,
  maxFontSizeMultiplier = 1.3,
  ...props
}: AppTextProps) {
  return (
    <Text
      style={[{ fontFamily: Fonts[weight] }, style]}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...props}
    />
  );
}
