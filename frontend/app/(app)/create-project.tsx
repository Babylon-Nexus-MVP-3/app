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

const ROLES = [
  "Owner",
  "Financier",
  "Builder",
  "Project Manager",
  "Subcontractor",
  "Consultant",
  "Certifier",
];

export default function CreateProject() {
  const { user, fetchWithAuth } = useAuth();

  useFocusEffect(
    useCallback(() => {
      setSubmitted(false);
      setName("");
      setAddress("");
      setRole("");
      setError(null);
    }, [])
  );

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("");
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !address.trim() || !role) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth("http://localhost:3229/project", {
        method: "POST",
        body: JSON.stringify({
          location: address.trim(),
          council: "TBD",
          ownerId: user?.id ?? "",
          builderId: "TBD",
          status: "Pending",
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

          <Text style={styles.label}>Your Role on This Project</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowRolePicker(true)}
            activeOpacity={0.8}
          >
            <Text style={role ? styles.roleSelected : styles.rolePlaceholder}>
              {role || "Select role..."}
            </Text>
          </TouchableOpacity>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitBtn, (!name || !address || !role) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading || !name || !address || !role}
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

      {/* Role picker modal */}
      <Modal visible={showRolePicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRolePicker(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Role</Text>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={styles.roleOption}
                onPress={() => {
                  setRole(r);
                  setShowRolePicker(false);
                }}
              >
                <Text style={[styles.roleOptionText, role === r && styles.roleOptionSelected]}>
                  {r}
                </Text>
                {role === r && <Ionicons name="checkmark" size={18} color={Colors.gold} />}
              </TouchableOpacity>
            ))}
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
