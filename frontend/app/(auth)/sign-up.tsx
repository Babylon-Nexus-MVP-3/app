import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";

const ROLES = [
  "Owner",
  "Financier",
  "Builder",
  "Project Manager",
  "Subcontractor",
  "Consultant",
  "Certifier",
];

// Maps frontend role labels to backend UserRole enum values
const ROLE_MAP: Record<string, string> = {
  Owner: "Owner",
  Financier: "Owner",
  Builder: "Builder",
  "Project Manager": "PM",
  Subcontractor: "Subbie",
  Consultant: "Consultant",
  Certifier: "Consultant",
};

export default function SignUp() {
  const [step, setStep] = useState(1);

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2
  const [projectCode, setProjectCode] = useState("");

  // Step 3
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    } else {
      router.back();
    }
  }

  function handleStep1() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setStep(2);
  }

  function handleStep2() {
    // TODO: POST /projects/join { projectCode } when backend endpoint is ready
    setStep(3);
  }

  async function handleStep3() {
    if (selectedRoles.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const role = ROLE_MAP[selectedRoles[0]];
      const response = await fetch("http://localhost:3229/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          password,
          role,
        }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok) {
        throw new Error(data.error ?? text ?? "Registration failed. Please try again.");
      }
      router.replace("/(auth)/pending-approval");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const progressBar = (
    <View style={styles.progressRow}>
      {[1, 2, 3].map((s) => (
        <View
          key={s}
          style={[styles.progressSegment, s <= step && styles.progressActive]}
        />
      ))}
    </View>
  );

  return (
    <LinearGradient
      colors={[Colors.navy, Colors.navyLight]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {progressBar}

          {step === 1 && (
            <>
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.subtitle}>
                Enter your details to get started
              </Text>

              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Alex"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Jordan"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleStep1}
              />
              <View style={styles.hints}>
                <Text style={styles.hintLabel}>Password must contain at least:</Text>
                <Text style={[styles.hint, password.length >= 12 && password.length <= 50 && styles.hintMet]}>
                  · 12 characters
                </Text>
                <Text style={[styles.hint, [/[a-z]/.test(password), /[A-Z]/.test(password), /[0-9]/.test(password), /[^a-zA-Z0-9]/.test(password)].filter(Boolean).length >= 3 && styles.hintMet]}>
                  · 3 of 4: uppercase, lowercase, number, special character
                </Text>
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleStep1}
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleStep1}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.navy} />
                ) : (
                  <Text style={styles.primaryButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.title}>Select project</Text>
              <Text style={styles.subtitle}>
                Which project are you joining?
              </Text>

              <Text style={styles.label}>Project Name or Code</Text>
              <TextInput
                style={styles.input}
                value={projectCode}
                onChangeText={setProjectCode}
                placeholder="e.g. Strathfield Apartments"
                placeholderTextColor="rgba(255,255,255,0.3)"
                returnKeyType="done"
                onSubmitEditing={handleStep2}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleStep2}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.title}>Your role</Text>
              <Text style={styles.subtitle}>
                Select your role(s) on this project
              </Text>

              <View style={styles.rolesContainer}>
                {ROLES.map((role) => {
                  const selected = selectedRoles.includes(role);
                  return (
                    <TouchableOpacity
                      key={role}
                      onPress={() => toggleRole(role)}
                      style={[
                        styles.roleButton,
                        selected && styles.roleButtonSelected,
                      ]}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.roleCheckbox,
                          selected && styles.roleCheckboxSelected,
                        ]}
                      >
                        {selected && (
                          <Text style={styles.roleCheckmark}>✓</Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.roleText,
                          selected && styles.roleTextSelected,
                        ]}
                      >
                        {role}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (selectedRoles.length === 0 || loading) && styles.primaryButtonDisabled,
                ]}
                onPress={handleStep3}
                disabled={selectedRoles.length === 0 || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.navy} />
                ) : (
                  <Text
                    style={[
                      styles.primaryButtonText,
                      selectedRoles.length === 0 && styles.primaryButtonTextDisabled,
                    ]}
                  >
                    Submit for Approval
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  keyboardView: { flex: 1 },
  inner: {
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backArrow: {
    fontSize: 28,
    color: Colors.gold,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 32,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  progressActive: {
    backgroundColor: Colors.gold,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
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
  },
  hints: {
    gap: 4,
    marginTop: -8,
    marginBottom: 24,
  },
  hintLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    marginBottom: 2,
  },
  hint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
  hintMet: {
    color: Colors.green,
  },
  errorText: {
    fontSize: 13,
    color: Colors.red,
    marginBottom: 16,
    textAlign: "center",
  },
  primaryButton: {
    height: 54,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  primaryButtonText: {
    color: Colors.navy,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  primaryButtonTextDisabled: {
    color: "rgba(255,255,255,0.3)",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  rolesContainer: {
    gap: 10,
    marginBottom: 32,
  },
  roleButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  roleButtonSelected: {
    borderWidth: 2,
    borderColor: Colors.gold,
    backgroundColor: "rgba(201,168,76,0.15)",
  },
  roleCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "transparent",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roleCheckboxSelected: {
    borderWidth: 2,
    borderColor: Colors.gold,
    backgroundColor: Colors.gold,
  },
  roleCheckmark: {
    fontSize: 13,
    color: Colors.navy,
    fontWeight: "700",
  },
  roleText: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
  roleTextSelected: {
    fontWeight: "700",
    color: Colors.gold,
  },
});
