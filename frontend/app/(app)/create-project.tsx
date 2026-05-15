import { API_BASE_URL } from "@/constants/api";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import { useAuth } from "@/context/AuthContext";
import { authStyles } from "@/constants/authStyles";
import { appStyles } from "@/constants/appStyles";
import { AppText } from "@/components/AppText";

const ROLES = [
  "Owner",
  "Builder",
  "Project Manager",
  "Subcontractor",
  "Consultant",
  "Financier",
  "VIP",
  "Observer",
];

const ROLE_MAP: Record<string, string> = {
  "Project Manager": "PM",
  Subcontractor: "Subbie",
};

type Invitee = { email: string; role: string };
type RoleTarget = "creator" | number;

export default function CreateProject() {
  const { user, fetchWithAuth } = useAuth();

  useFocusEffect(
    useCallback(() => {
      setSubmitted(false);
      setName("");
      setAddress("");
      setCouncil("");
      setDaNumber("");
      setDaApproved(null);
      setRole("");
      setInvitees([]);
      setHasInsurance(null);
      setHasLicence(null);
      setError(null);
    }, [])
  );

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [council, setCouncil] = useState("");
  const [role, setRole] = useState("");
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [rolePickerTarget, setRolePickerTarget] = useState<RoleTarget | null>(null);
  const [hasInsurance, setHasInsurance] = useState<"yes" | "no" | "na" | null>(null);
  const [hasLicence, setHasLicence] = useState<"yes" | "no" | "na" | null>(null);
  const [daApproved, setDaApproved] = useState<"yes" | "no" | null>(null);
  const [daNumber, setDaNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleRoleSelect(r: string) {
    if (rolePickerTarget === "creator") {
      setRole(r);
    } else if (typeof rolePickerTarget === "number") {
      setInvitees((prev) =>
        prev.map((inv, i) => (i === rolePickerTarget ? { ...inv, role: r } : inv))
      );
    }
    setRolePickerTarget(null);
  }

  function addInvitee() {
    setInvitees((prev) => [...prev, { email: "", role: "" }]);
  }

  function removeInvitee(index: number) {
    setInvitees((prev) => prev.filter((_, i) => i !== index));
  }

  function updateInviteeEmail(index: number, email: string) {
    setInvitees((prev) => prev.map((inv, i) => (i === index ? { ...inv, email } : inv)));
  }

  function getActiveRoleValue(): string {
    if (rolePickerTarget === "creator") return role;
    if (typeof rolePickerTarget === "number") return invitees[rolePickerTarget]?.role ?? "";
    return "";
  }

  async function handleSubmit() {
    if (!name.trim() || !address.trim() || !council.trim() || !role) {
      setError("Please fill in all fields.");
      return;
    }

    const incompleteInvitee = invitees.find((inv) => !inv.email.trim() || !inv.role);
    if (incompleteInvitee) {
      setError("Please fill in the email and role for all invited team members.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/project`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          location: address.trim(),
          council: council.trim(),
          creatorRole: ROLE_MAP[role] ?? role,
          ...(role === "Owner" && { ownerId: user?.id }),
          ...(role === "Builder" && { builderId: user?.id }),
          ...((ROLE_MAP[role] ?? role) === "PM" && { pmId: user?.id }),
          creatorHasInsurance: hasInsurance === "yes" ? true : hasInsurance === "no" ? false : null,
          creatorHasLicence: hasLicence === "yes" ? true : hasLicence === "no" ? false : null,
          ...(daApproved === "yes" && daNumber.trim() && { daNumber: daNumber.trim() }),
          invitees: invitees.map((inv) => ({
            email: inv.email.trim(),
            role: ROLE_MAP[inv.role] ?? inv.role,
          })),
        }),
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (!response.ok) throw new Error(data.error ?? "Failed to create project");

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <SafeAreaView style={authStyles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.successScreen}>
          <View style={styles.successCenter}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={40} color={Colors.white} />
            </View>
            <AppText style={styles.successTitle}>Project Submitted</AppText>
            <AppText style={styles.successSubtitle}>
              {"Awaiting VouchPay admin approval. You'll be notified once it's reviewed."}
            </AppText>
          </View>
          <TouchableOpacity
            onPress={() => router.replace("/(app)/projects")}
            style={authStyles.primaryButton}
            activeOpacity={0.85}
          >
            <AppText style={authStyles.primaryButtonText}>Back to Projects</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={appStyles.safeArea}>
      <View style={appStyles.header}>
        <SafeAreaView edges={["top"]}>
          <View style={appStyles.headerInner}>
            <TouchableOpacity
              onPress={() => router.replace("/(app)/projects" as any)}
              style={appStyles.headerIconBtn}
              hitSlop={HEADER_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={20} color={Colors.white} />
            </TouchableOpacity>
            <AppText style={appStyles.headerTitle}>New Project</AppText>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={authStyles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={authStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Project details ── */}
          <AppText style={authStyles.fieldLabel}>PROJECT NAME</AppText>
          <TextInput
            style={authStyles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Strathfield Apartments"
            placeholderTextColor={Colors.grey300}
            returnKeyType="next"
          />

          <AppText style={authStyles.fieldLabel}>PROJECT ADDRESS</AppText>
          <TextInput
            style={authStyles.textInput}
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. 24 Albert Rd, Strathfield NSW"
            placeholderTextColor={Colors.grey300}
            returnKeyType="next"
          />

          <AppText style={authStyles.fieldLabel}>COUNCIL</AppText>
          <TextInput
            style={authStyles.textInput}
            value={council}
            onChangeText={setCouncil}
            placeholder="e.g. Strathfield Council"
            placeholderTextColor={Colors.grey300}
            returnKeyType="next"
          />

          <AppText style={authStyles.fieldLabel}>DA APPROVED?</AppText>
          <View style={[appStyles.optionRow, styles.chipRow]}>
            {(["yes", "no"] as const).map((val) => (
              <TouchableOpacity
                key={val}
                style={[appStyles.optionChip, daApproved === val && appStyles.optionChipActive]}
                onPress={() => {
                  setDaApproved(val);
                  if (val === "no") setDaNumber("");
                }}
                activeOpacity={0.75}
              >
                <AppText
                  style={[
                    appStyles.optionChipText,
                    daApproved === val && appStyles.optionChipTextActive,
                  ]}
                >
                  {val === "yes" ? "Yes" : "No"}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          {daApproved === "yes" && (
            <>
              <AppText style={authStyles.fieldLabel}>
                DA NUMBER <AppText style={styles.optionalLabel}>(optional)</AppText>
              </AppText>
              <TextInput
                style={authStyles.textInput}
                value={daNumber}
                onChangeText={setDaNumber}
                placeholder="e.g. DA-2026-1001"
                placeholderTextColor={Colors.grey300}
                returnKeyType="next"
              />
            </>
          )}

          <AppText style={authStyles.fieldLabel}>YOUR ROLE</AppText>
          <TouchableOpacity
            style={styles.roleSelector}
            onPress={() => setRolePickerTarget("creator")}
            activeOpacity={0.8}
          >
            <AppText style={role ? styles.roleSelectorText : styles.roleSelectorPlaceholder}>
              {role || "Select role..."}
            </AppText>
            <Ionicons name="chevron-down" size={18} color={Colors.grey500} />
          </TouchableOpacity>

          {/* ── Invite team members ── */}
          <View style={styles.sectionDivider} />
          <AppText style={styles.sectionTitle}>Invite Team Members</AppText>
          <AppText style={styles.sectionHint}>
            {"Add others to this project. They’ll receive an invite code once approved."}
          </AppText>

          {invitees.map((inv, index) => (
            <View key={index} style={styles.inviteeCard}>
              <View style={styles.inviteeCardHeader}>
                <AppText style={styles.inviteeCardLabel}>Person {index + 1}</AppText>
                <TouchableOpacity onPress={() => removeInvitee(index)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={Colors.grey300} />
                </TouchableOpacity>
              </View>

              <AppText style={styles.inviteeFieldLabel}>EMAIL</AppText>
              <TextInput
                style={styles.inviteeInput}
                value={inv.email}
                onChangeText={(t) => updateInviteeEmail(index, t)}
                placeholder="their@email.com"
                placeholderTextColor={Colors.grey300}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />

              <AppText style={styles.inviteeFieldLabel}>ROLE</AppText>
              <TouchableOpacity
                style={styles.inviteeRoleSelector}
                onPress={() => setRolePickerTarget(index)}
                activeOpacity={0.8}
              >
                <AppText
                  style={inv.role ? styles.roleSelectorText : styles.roleSelectorPlaceholder}
                >
                  {inv.role || "Select role..."}
                </AppText>
                <Ionicons name="chevron-down" size={16} color={Colors.grey500} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addInviteeBtn} onPress={addInvitee} activeOpacity={0.75}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.vouchGreen} />
            <AppText style={styles.addInviteeBtnText}>Add Team Member</AppText>
          </TouchableOpacity>

          {/* ── Compliance ── */}
          <View style={styles.sectionDivider} />
          <AppText style={styles.sectionTitle}>Compliance</AppText>

          <AppText style={authStyles.fieldLabel}>PUBLIC LIABILITY INSURANCE?</AppText>
          <View style={[appStyles.optionRow, styles.chipRow]}>
            {(["yes", "no", "na"] as const).map((val) => (
              <TouchableOpacity
                key={val}
                style={[appStyles.optionChip, hasInsurance === val && appStyles.optionChipActive]}
                onPress={() => setHasInsurance(val)}
                activeOpacity={0.75}
              >
                <AppText
                  style={[
                    appStyles.optionChipText,
                    hasInsurance === val && appStyles.optionChipTextActive,
                  ]}
                >
                  {val === "yes" ? "Yes" : val === "no" ? "No" : "N/A"}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppText style={authStyles.fieldLabel}>{"CONTRACTOR'S LICENCE?"}</AppText>
          <View style={[appStyles.optionRow, styles.chipRow]}>
            {(["yes", "no", "na"] as const).map((val) => (
              <TouchableOpacity
                key={val}
                style={[appStyles.optionChip, hasLicence === val && appStyles.optionChipActive]}
                onPress={() => setHasLicence(val)}
                activeOpacity={0.75}
              >
                <AppText
                  style={[
                    appStyles.optionChipText,
                    hasLicence === val && appStyles.optionChipTextActive,
                  ]}
                >
                  {val === "yes" ? "Yes" : val === "no" ? "No" : "N/A"}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          {error && <AppText style={authStyles.errorText}>{error}</AppText>}

          <TouchableOpacity
            style={[
              authStyles.primaryButton,
              (!name || !address || !council || !role) && authStyles.primaryButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || !name || !address || !council || !role}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <AppText style={authStyles.primaryButtonText}>Submit for Approval</AppText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Role picker modal */}
      <Modal visible={rolePickerTarget !== null} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRolePickerTarget(null)}
        >
          <View style={styles.modalSheet}>
            <AppText style={styles.modalTitle}>Select Role</AppText>
            {ROLES.map((r) => {
              const active = getActiveRoleValue();
              return (
                <TouchableOpacity
                  key={r}
                  style={styles.roleOption}
                  onPress={() => handleRoleSelect(r)}
                >
                  <AppText
                    style={[styles.roleOptionText, active === r && styles.roleOptionSelected]}
                  >
                    {r}
                  </AppText>
                  {active === r && (
                    <Ionicons name="checkmark" size={18} color={Colors.vouchGreen} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    marginBottom: 20,
  },
  optionalLabel: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textTransform: "none",
    letterSpacing: 0,
  },
  roleSelector: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: Colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roleSelectorText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black,
  },
  roleSelectorPlaceholder: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.grey300,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.grey300,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginBottom: 20,
    lineHeight: 18,
  },
  inviteeCard: {
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    backgroundColor: Colors.white,
  },
  inviteeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  inviteeCardLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.vouchGreen,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  inviteeFieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  inviteeInput: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Fonts.regular,
    marginBottom: 14,
    backgroundColor: Colors.white,
    color: Colors.black,
  },
  inviteeRoleSelector: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
  },
  addInviteeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 24,
    justifyContent: "center",
  },
  addInviteeBtnText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
  // Success screen
  successScreen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  successCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.vouchGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    color: Colors.black,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  // Role picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: 16,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey100,
  },
  roleOptionText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black,
  },
  roleOptionSelected: {
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
});
