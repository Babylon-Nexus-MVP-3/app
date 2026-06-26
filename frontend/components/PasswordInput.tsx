import { forwardRef, useState, useCallback } from "react";
import { StyleSheet, TextInput, TextInputProps, TouchableOpacity, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { Radius, Size, Spacing } from "@/constants/spacing";

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
  onFocus?: TextInputProps["onFocus"];
  onBlur?: TextInputProps["onBlur"];
  containerStyle?: ViewStyle;
  accessibilityLabel?: string;
  autoFocus?: boolean;
}

export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(function PasswordInput(
  {
    value,
    onChangeText,
    placeholder = "••••••••••••",
    returnKeyType = "done",
    onSubmitEditing,
    onFocus,
    onBlur,
    containerStyle,
    accessibilityLabel = "password",
    autoFocus,
  },
  ref
) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleFocus = useCallback<NonNullable<TextInputProps["onFocus"]>>((e) => {
    setFocused(true);
    onFocus?.(e);
  }, [onFocus]);

  const handleBlur = useCallback<NonNullable<TextInputProps["onBlur"]>>((e) => {
    setFocused(false);
    onBlur?.(e);
  }, [onBlur]);

  return (
    <View style={[styles.row, focused && styles.rowFocused, containerStyle]}>
      <TextInput
        ref={ref}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.grey300}
        secureTextEntry={!show}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoFocus={autoFocus}
      />
      <TouchableOpacity
        style={styles.eyeBtn}
        onPress={() => setShow((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={show ? `Hide ${accessibilityLabel}` : `Show ${accessibilityLabel}`}
      >
        <Ionicons
          name={show ? "eye-off-outline" : "eye-outline"}
          size={20}
          color={Colors.grey500}
        />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    height: Size.input,
  },
  rowFocused: {
    borderColor: Colors.vouchGreen,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black,
  },
  eyeBtn: {
    paddingHorizontal: 14,
  },
});
