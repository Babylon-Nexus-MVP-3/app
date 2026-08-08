import { useState } from "react";
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";

/**
 * A dropdown backed by the platform's own picker — UIPickerView on iOS,
 * Spinner on Android — rather than a hand-built sheet. Users already know how
 * these behave, which matters more than matching our own styling.
 *
 * iOS shows the wheel in a sheet with a Done button (a bare inline wheel has
 * no way to confirm); Android opens its native dropdown on tap.
 */
export function NativeSelect({
  label,
  value,
  options,
  placeholder = "Select",
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // The wheel reports every value it scrolls past, so iOS holds a draft until
  // the user confirms.
  const [draft, setDraft] = useState(value);

  function openPicker() {
    setDraft(value || options[0]);
    setOpen(true);
  }

  return (
    <View style={styles.wrap}>
      <AppText style={styles.label}>{label}</AppText>

      {Platform.OS === "ios" ? (
        <>
          <TouchableOpacity
            style={styles.field}
            onPress={openPicker}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value || placeholder}`}
          >
            <AppText style={value ? styles.value : styles.placeholder}>
              {value || placeholder}
            </AppText>
            <Ionicons name="chevron-down" size={16} color={Colors.grey500} />
          </TouchableOpacity>

          <Modal
            visible={open}
            transparent
            animationType="slide"
            onRequestClose={() => setOpen(false)}
          >
            <TouchableOpacity
              style={styles.backdrop}
              activeOpacity={1}
              onPress={() => setOpen(false)}
            />
            <View style={styles.sheet}>
              <View style={styles.sheetBar}>
                <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                  <AppText style={styles.cancel}>Cancel</AppText>
                </TouchableOpacity>
                <AppText style={styles.sheetTitle}>{label}</AppText>
                <TouchableOpacity
                  onPress={() => {
                    onChange(draft);
                    setOpen(false);
                  }}
                  hitSlop={8}
                >
                  <AppText style={styles.done}>Done</AppText>
                </TouchableOpacity>
              </View>
              <Picker selectedValue={draft} onValueChange={(v) => setDraft(String(v))}>
                {options.map((o) => (
                  <Picker.Item key={o} label={o} value={o} />
                ))}
              </Picker>
            </View>
          </Modal>
        </>
      ) : (
        <View style={styles.field}>
          <Picker
            selectedValue={value}
            onValueChange={(v) => onChange(String(v))}
            style={styles.androidPicker}
            dropdownIconColor={Colors.grey500}
            prompt={label}
          >
            <Picker.Item label={placeholder} value="" color={Colors.grey500} />
            {options.map((o) => (
              <Picker.Item key={o} label={o} value={o} />
            ))}
          </Picker>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.black, letterSpacing: 0.8 },
  field: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  value: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.black },
  placeholder: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.grey300 },
  androidPicker: { flex: 1, marginHorizontal: -8, color: Colors.black },
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  sheet: { backgroundColor: Colors.white, paddingBottom: 24 },
  sheetBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey300,
  },
  sheetTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.black },
  cancel: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.grey500 },
  done: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.vouchGreen },
});
