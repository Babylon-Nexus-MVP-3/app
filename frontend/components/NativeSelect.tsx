import { useState } from "react";
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";

/**
 * A dropdown rendered entirely in-app rather than by the platform picker.
 *
 * We used to use @react-native-picker/picker here. The app runs with
 * userInterfaceStyle "automatic", and the native picker draws its rows in the
 * system label colour — white in dark mode — on top of our hardcoded white
 * sheet, so the options were invisible on every device in dark mode. Owning the
 * list means it uses our own tokens and can't be re-themed out from under us.
 *
 * One tap opens the sheet, one tap picks a value and closes it — no separate
 * confirm step, since there's no wheel to scroll past values.
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

  return (
    <View style={styles.wrap}>
      <AppText style={styles.label}>{label}</AppText>

      <TouchableOpacity
        style={styles.field}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
      >
        <AppText style={value ? styles.value : styles.placeholder}>{value || placeholder}</AppText>
        <Ionicons name="chevron-down" size={16} color={Colors.grey500} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
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
            {/* Balances the bar so the title stays centred. */}
            <View style={styles.cancelSpacer} />
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {options.map((o) => {
              const selected = o === value;
              return (
                <TouchableOpacity
                  key={o}
                  style={styles.option}
                  onPress={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <AppText style={selected ? styles.optionTextSelected : styles.optionText}>
                    {o}
                  </AppText>
                  {selected && <Ionicons name="checkmark" size={18} color={Colors.vouchGreen} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
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
  placeholder: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.grey500 },
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    maxHeight: "70%",
  },
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
  cancelSpacer: { width: 48 },
  list: { flexGrow: 0 },
  listContent: { paddingVertical: 4 },
  option: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionText: { flex: 1, fontSize: 16, fontFamily: Fonts.regular, color: Colors.black },
  optionTextSelected: { flex: 1, fontSize: 16, fontFamily: Fonts.bold, color: Colors.vouchGreen },
});
