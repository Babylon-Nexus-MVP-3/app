import { useState } from "react";
import { ActivityIndicator, View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { ScreenHeader, sheetStyle } from "@/components/ScreenHeader";
import { SectionLabel } from "@/components/ui";
import { AbrCard } from "@/components/AbrCard";
import { useAuth } from "@/context/AuthContext";
import { useWizard } from "./WizardContext";
import { useAbrLookup } from "@/lib/useAbrLookup";
import { formatAbn, fullName } from "@/lib/format";
import { saveVouchProfileStep } from "@/lib/useVouchProfile";
import { showAlert } from "@/lib/errors";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText style={styles.infoValue}>{value || "—"}</AppText>
    </View>
  );
}

export default function Step1() {
  const { user, fetchWithAuth } = useAuth();
  const { step1, setStep1 } = useWizard();

  const [saving, setSaving] = useState(false);

  const { abrResult, abrLoading, abrError } = useAbrLookup(
    user?.abn?.replace(/\D/g, "") ?? step1.abn
  );

  /*
    Everything on this step comes from the account itself, so there is nothing
    to type. It used to carry a free-text "trade / business type" box, which was
    a second, independent answer to the question step 2 already asks as the
    licence class — the two drifted, and the Me card showed one while the wizard
    showed the other. Trade is asked once, in step 2.
  */
  function currentDetails() {
    const updated = {
      ...step1,
      firstName: user?.firstName ?? step1.firstName,
      lastName: user?.lastName ?? step1.lastName,
      abn: (user?.abn ?? step1.abn).replace(/\D/g, ""),
    };
    setStep1(updated);
    return updated;
  }

  async function onSave() {
    const updated = currentDetails();
    setSaving(true);
    const error = await saveVouchProfileStep(fetchWithAuth, {
      ...updated,
      references: [],
    });
    setSaving(false);
    // Only leave the screen once the server has actually accepted the save.
    if (error) {
      showAlert("Couldn't save", error);
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        showBack
        eyebrow="Step 1 of 2"
        title="Your details"
        subtitle="Confirm the details on your account."
      />

      <ScrollView
        style={sheetStyle.sheet}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel>From your account</SectionLabel>
        <View style={styles.detailsCard}>
          <InfoRow
            label="NAME"
            value={
              fullName(user?.firstName, user?.lastName) || fullName(step1.firstName, step1.lastName)
            }
          />
          <View style={styles.divider} />
          <InfoRow label="ABN" value={formatAbn((user?.abn ?? step1.abn).replace(/\D/g, ""))} />
          {(abrResult || abrLoading || abrError) && (
            <AbrCard abrResult={abrResult} abrLoading={abrLoading} abrError={abrError} />
          )}
          <View style={styles.divider} />
          <InfoRow label="BUSINESS NAME" value={user?.businessName ?? ""} />
          <View style={styles.lockNote}>
            <Ionicons name="lock-closed-outline" size={12} color={Colors.grey500} />
            <AppText style={styles.lockText}>
              Name and ABN are locked to your account details.
            </AppText>
          </View>
        </View>

        <AppText style={styles.fieldHint}>
          Your trade is set on the next step, alongside your licence.
        </AppText>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.85}
          accessibilityState={{ disabled: saving, busy: saving }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <AppText style={styles.primaryBtnText}>Save &amp; continue</AppText>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.vouchGreen },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 22 },
  detailsCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 16,
    padding: 16,
    marginBottom: 26,
  },
  infoRow: { paddingVertical: 10 },
  infoLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoValue: { fontSize: 16, fontFamily: Fonts.regular, color: Colors.black },
  divider: { height: 1, backgroundColor: Colors.grey300, marginVertical: 4 },
  lockNote: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  lockText: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.grey500 },
  fieldHint: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.grey500, lineHeight: 18 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: Colors.white,
  },
  primaryBtn: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontFamily: Fonts.bold },
});
