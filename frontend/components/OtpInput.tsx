import { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, TextInput, View, ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { Radius, Size, Spacing } from "@/constants/spacing";

export interface OtpInputRef {
  focusFirst: () => void;
}

interface OtpInputProps {
  digits: string[];
  onChange: (digits: string[]) => void;
  length?: number;
  style?: ViewStyle;
}

export const OtpInput = forwardRef<OtpInputRef, OtpInputProps>(function OtpInput(
  { digits, onChange, length = 6, style },
  ref
) {
  const inputRefs = useRef<(TextInput | null)[]>(Array(length).fill(null));

  useImperativeHandle(ref, () => ({
    focusFirst: () => {
      inputRefs.current[0]?.focus();
    },
  }));

  function handleDigitChange(index: number, value: string) {
    const sanitized = value.replace(/\D/g, "");
    if (sanitized.length > 1) {
      const next = [...digits];
      sanitized.slice(0, length).split("").forEach((char, i) => {
        if (index + i < length) next[index + i] = char;
      });
      onChange(next);
      inputRefs.current[Math.min(index + sanitized.length - 1, length - 1)]?.focus();
      return;
    }
    const digit = sanitized.slice(-1);
    const next = [...digits];
    next[index] = digit;
    onChange(next);
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      onChange(next);
      inputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <View style={[styles.row, style]}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={(r) => {
            inputRefs.current[i] = r;
          }}
          style={[styles.box, d ? styles.boxFilled : null]}
          value={d}
          onChangeText={(v) => handleDigitChange(i, v)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
          keyboardType="numeric"
          maxLength={2}
          textAlign="center"
          selectTextOnFocus
          autoFocus={i === 0}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.gap,
  },
  box: {
    width: Size.otpBoxWidth,
    height: Size.otpBox,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    borderRadius: Radius.md,
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  boxFilled: {
    borderColor: Colors.vouchGreen,
  },
});
