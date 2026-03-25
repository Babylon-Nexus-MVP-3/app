import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const ROLES = ["Owner", "Builder", "PM", "Subbie", "Consultant", "Financier", "VIP", "Observer"];

type Invitee = { email: string; role: string };

// Tracks which role picker is open: "creator" or an invitee index
type RoleTarget = "creator" | number;

export default function CreateProject() {
  const { user, fetchWithAuth } = useAuth();

  useFocusEffect(
    useCallback(() => {
      setSubmitted(false);
      setName("");
      setAddress("");
      setCouncil("");
      setRole("");
      setInvitees([]);
      setError(null);
    }, [])
  );

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [council, setCouncil] = useState("");
  const [role, setRole] = useState("");
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [rolePickerTarget, setRolePickerTarget] = useState<RoleTarget | null>(null);
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
      const response = await fetchWithAuth("http://localhost:3229/project", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          location: address.trim(),
          council: council.trim(),
          creatorRole: role,
          ...(role === "Owner" && { ownerId: user?.id }),
          ...(role === "Builder" && { builderId: user?.id }),
          ...(role === "PM" && { pmId: user?.id }),
          invitees: invitees.map((inv) => ({ email: inv.email.trim(), role: inv.role })),
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
      <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.gradient}>
        <View style={styles.successContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View style={styles.successContent}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={36} color={Colors.green} />
            </View>
            <Text style={styles.successTitle}>Project Submitted</Text>
            <Text style={styles.successSubtitle}>Awaiting Babylon Nexus admin approval.</Text>
            <TouchableOpacity
              style={styles.backToProjectsBtn}
              onPress={() => router.replace("/(app)/projects")}
              activeOpacity={0.8}
            >
              <Text style={styles.backToProjectsText}>Back to Projects</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create New Project</Text>
          <Text style={styles.subtitle}>Submit a project for admin approval</Text>

          {/* ── Project details ── */}
          <Text style={styles.label}>Project Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Strathfield Apartments"
            placeholderTextColor="rgba(255,255,255,0.3)"
            returnKeyType="next"
          />

          <Text style={styles.label}>Project Address</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. 24 Albert Rd, Strathfield NSW"
            placeholderTextColor="rgba(255,255,255,0.3)"
            returnKeyType="next"
          />

          <Text style={styles.label}>Council</Text>
          <TextInput
            style={styles.input}
            value={council}
            onChangeText={setCouncil}
            placeholder="e.g. Strathfield Council"
            placeholderTextColor="rgba(255,255,255,0.3)"
            returnKeyType="next"
          />

          <Text style={styles.label}>Your Role on This Project</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setRolePickerTarget("creator")}
            activeOpacity={0.8}
          >
            <Text style={role ? styles.roleSelected : styles.rolePlaceholder}>
              {role || "Select role..."}
            </Text>
          </TouchableOpacity>

          {/* ── Invite team members ── */}
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionTitle}>Invite Team Members</Text>
          <Text style={styles.sectionHint}>
            {"Add others to this project. They'll receive an invite code once approved."}
          </Text>

          {invitees.map((inv, index) => (
            <View key={index} style={styles.inviteeCard}>
              <View style={styles.inviteeCardHeader}>
                <Text style={styles.inviteeCardLabel}>Person {index + 1}</Text>
                <TouchableOpacity onPress={() => removeInvitee(index)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.35)" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inviteeFieldLabel}>Email</Text>
              <TextInput
                style={styles.inviteeInput}
                value={inv.email}
                onChangeText={(t) => updateInviteeEmail(index, t)}
                placeholder="their@email.com"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />

              <Text style={styles.inviteeFieldLabel}>Role</Text>
              <TouchableOpacity
                style={styles.inviteeInput}
                onPress={() => setRolePickerTarget(index)}
                activeOpacity={0.8}
              >
                <Text style={inv.role ? styles.roleSelected : styles.rolePlaceholder}>
                  {inv.role || "Select role..."}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addInviteeBtn} onPress={addInvitee} activeOpacity={0.75}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.gold} />
            <Text style={styles.addInviteeBtnText}>Add Team Member</Text>
          </TouchableOpacity>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!name || !address || !council || !role) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || !name || !address || !council || !role}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.navy} />
            ) : (
              <Text style={styles.submitText}>Submit for Approval</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Shared role picker modal */}
      <Modal visible={rolePickerTarget !== null} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRolePickerTarget(null)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Role</Text>
            {ROLES.map((r) => {
              const active = getActiveRoleValue();
              return (
                <TouchableOpacity
                  key={r}
                  style={styles.roleOption}
                  onPress={() => handleRoleSelect(r)}
                >
                  <Text style={[styles.roleOptionText, active === r && styles.roleOptionSelected]}>
                    {r}
                  </Text>
                  {active === r && <Ionicons name="checkmark" size={18} color={Colors.gold} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 24,
  },
  backArrow: {
    fontSize: 28,
    color: Colors.gold,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 36,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.goldLight,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.25)",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: Colors.white,
    justifyContent: "center",
  },
  rolePlaceholder: {
    fontSize: 16,
    color: "rgba(255,255,255,0.3)",
  },
  roleSelected: {
    fontSize: 16,
    color: Colors.white,
  },

  // Team members section
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 20,
    lineHeight: 18,
  },
  inviteeCard: {
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.2)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  inviteeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  inviteeCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.gold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  inviteeFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  inviteeInput: {
    height: 46,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: Colors.white,
    justifyContent: "center",
  },
  addInviteeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.4)",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 24,
    justifyContent: "center",
  },
  addInviteeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.gold,
  },

  errorText: {
    fontSize: 13,
    color: Colors.red,
    marginBottom: 16,
    textAlign: "center",
  },
  submitBtn: {
    height: 54,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: Colors.navy,
    fontWeight: "700",
    fontSize: 16,
  },

  // Success screen
  successContainer: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 24,
  },
  successContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: "rgba(46,204,113,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 36,
    textAlign: "center",
  },
  backToProjectsBtn: {
    height: 48,
    paddingHorizontal: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backToProjectsText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.gold,
  },

  // Role modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.navyLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: 16,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  roleOptionText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
  },
  roleOptionSelected: {
    color: Colors.gold,
    fontWeight: "600",
  },
});
