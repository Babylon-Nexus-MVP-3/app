import { forwardRef, useState } from "react";
import { StyleSheet, TextInput, TextInputProps, ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { Radius, Size, Spacing } from "@/constants/spacing";

interface AppInputProps extends TextInputProps {
  containerStyle?: ViewStyle;
}

export const AppInput = forwardRef<TextInput, AppInputProps>(function AppInput(
  { style, containerStyle, onFocus, onBlur, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      ref={ref}
      style={[
        styles.input,
        focused && styles.inputFocused,
        style,
      ]}
      placeholderTextColor={Colors.grey300}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    height: Size.input,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  inputFocused: {
    borderColor: Colors.vouchGreen,
  },
});
