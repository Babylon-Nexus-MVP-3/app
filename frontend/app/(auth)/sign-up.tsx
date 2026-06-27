import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { API_BASE_URL } from "@/constants/api";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { AbrCard } from "@/components/AbrCard";
import { AppInput } from "@/components/AppInput";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordStrengthHints } from "@/components/PasswordStrengthHints";
import { formatAbn, useAbrLookup } from "@/lib/useAbrLookup";

type SearchResult = { abn: string; entityName: string; state: string };

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [trade, setTrade] = useState("");
  const [abn, setAbn] = useState("");
  const [abnDigits, setAbnDigits] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessNameLocked, setBusinessNameLocked] = useState(false);

  const [searchMode, setSearchMode] = useState<"abn" | "name">("abn");
  const [nameQuery, setNameQuery] = useState("");
  const [nameResults, setNameResults] = useState<SearchResult[]>([]);
  const [nameSearching, setNameSearching] = useState(false);
  const [nameError, setNameError] = useState("");

  const { abrResult, abrLoading, abrError } = useAbrLookup(abnDigits);

  useEffect(() => {
    if (!businessNameLocked) {
      setBusinessName(abrResult ? abrResult.tradingName || abrResult.entityName : "");
    }
  }, [abrResult, businessNameLocked]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mobileDigits = mobile.replace(/\D/g, "");

  function formatMobileDisplay(digits: string): string {
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  function onAbnChange(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, 11);
    setAbnDigits(digits);
    setAbn(formatAbn(digits));
    setBusinessNameLocked(false);
  }

  async function onNameSearch() {
    const q = nameQuery.trim();
    if (q.length < 3) {
      setNameError("Enter at least 3 characters");
      return;
    }
    setNameError("");
    setNameSearching(true);
    setNameResults([]);
    try {
      const res = await fetch(`${API_BASE_URL}/abr/search?name=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setNameError(
          res.status >= 500
            ? "Search temporarily unavailable. Try entering your ABN directly."
            : "Search failed. Please try again."
        );
        return;
      }
      const data = await res.json();
      const results: SearchResult[] = data.results ?? [];
      if (results.length === 0) {
        setNameError("No businesses found. Try a different name.");
      } else {
        setNameResults(results);
      }
    } catch {
      setNameError("Search failed. Please try again.");
    } finally {
      setNameSearching(false);
    }
  }

  function onSelectResult(item: SearchResult) {
    const digits = item.abn.replace(/\D/g, "");
    setAbnDigits(digits);
    setAbn(formatAbn(digits));
    setBusinessName(item.entityName);
    setBusinessNameLocked(true);
    setSearchMode("abn");
    setNameResults([]);
    setNameQuery("");
  }

  const trimmedName = name.trim();
  const nameParts = trimmedName.split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") || "-";

  const pwChecks = {
    length: password.length >= 12,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };
  const complexityMet =
    [pwChecks.lower, pwChecks.upper, pwChecks.number, pwChecks.special].filter(Boolean).length >= 3;
  const passwordValid = pwChecks.length && complexityMet;

  const canSubmit =
    firstName.length > 0 &&
    email.includes("@") &&
    passwordValid &&
    trade.trim().length > 0 &&
    abnDigits.length === 11 &&
    !abrLoading &&
    !abrError &&
    !!abrResult &&
    businessName.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email.trim().toLowerCase(),
          password,
          ...(mobileDigits.length >= 10 ? { mobile: mobileDigits } : {}),
          ...(abnDigits.length === 11 ? { abn: abnDigits } : {}),
          ...(businessName.trim() ? { businessName: businessName.trim() } : {}),
          ...(trade.trim() ? { businessTrade: trade.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Sign up failed. Please try again.");
      }
    } catch (err: unknown) {
      if (!(err instanceof TypeError)) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setLoading(false);
        return;
      }
      // Network error — dev fallback, proceed to verify-email
    } finally {
      setLoading(false);
    }
    router.push({
      pathname: "/(auth)/verify-email",
      params: { email: email.trim().toLowerCase() },
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.black} />
          </TouchableOpacity>

          <AppText style={styles.title}>Create account.</AppText>
          <AppText style={styles.subtitle}>Enter your details to get started.</AppText>

          <AppText style={styles.label}>ABN</AppText>
          <View style={styles.abnSection}>
            {searchMode === "abn" ? (
              <>
                <AppInput
                  style={[styles.input, styles.abnInput]}
                  value={abn}
                  onChangeText={onAbnChange}
                  placeholder="XX XXX XXX XXX"
                  keyboardType="numeric"
                  returnKeyType="next"
                  autoFocus
                />
                <AbrCard abrResult={abrResult} abrLoading={abrLoading} abrError={abrError} />
                <TouchableOpacity
                  onPress={() => {
                    setSearchMode("name");
                    setNameError("");
                    setNameResults([]);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Search by business name instead"
                >
                  <AppText style={styles.searchByNameLink}>
                    {"Don't know your ABN? Search by name →"}
                  </AppText>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.nameSearchRow}>
                  <AppInput
                    style={styles.nameInput}
                    value={nameQuery}
                    onChangeText={(t) => {
                      setNameQuery(t);
                      setNameError("");
                    }}
                    placeholder="Search by business name"
                    returnKeyType="search"
                    onSubmitEditing={onNameSearch}
                    autoCapitalize="words"
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.nameSearchBtn}
                    onPress={onNameSearch}
                    disabled={nameSearching}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Search"
                    accessibilityState={{ disabled: nameSearching }}
                  >
                    {nameSearching ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Ionicons name="search" size={18} color={Colors.white} />
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => setSearchMode("abn")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Enter ABN instead"
                >
                  <AppText style={styles.searchByNameLink}>{"← Enter ABN instead"}</AppText>
                </TouchableOpacity>
                {nameError ? <AppText style={styles.nameErrorText}>{nameError}</AppText> : null}
                {nameResults.length > 0 && (
                  <View style={styles.resultsContainer}>
                    {nameResults.map((item, idx) => (
                      <TouchableOpacity
                        key={`${item.abn}-${idx}`}
                        style={[
                          styles.resultRow,
                          idx < nameResults.length - 1 && styles.resultRowBorder,
                        ]}
                        activeOpacity={0.75}
                        onPress={() => onSelectResult(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.entityName}, ABN ${formatAbn(item.abn)}, ${item.state}`}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <AppText style={styles.resultName} numberOfLines={1}>
                            {item.entityName}
                          </AppText>
                          <AppText style={styles.resultMeta}>
                            {item.state} · ABN {formatAbn(item.abn)}
                          </AppText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={Colors.grey500} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
            <View style={styles.abnWarning}>
              <Ionicons name="lock-closed-outline" size={12} color={Colors.amber} />
              <AppText style={styles.abnWarningText}>
                {
                  "You cannot change your ABN after creating your account — please make sure it's correct."
                }
              </AppText>
            </View>
          </View>

          <AppText style={styles.label}>BUSINESS NAME</AppText>
          <AppInput
            style={styles.input}
            value={businessName}
            onChangeText={(t) => {
              setBusinessName(t);
              setBusinessNameLocked(true);
            }}
            placeholder="Your business name"
            autoCapitalize="words"
            returnKeyType="next"
          />

          <AppText style={styles.label}>YOUR NAME</AppText>
          <AppInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Alex Smith"
            autoCapitalize="words"
            returnKeyType="next"
          />

          <AppText style={styles.label}>EMAIL</AppText>
          <AppInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <AppText style={styles.label}>PASSWORD</AppText>
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 12 characters"
            returnKeyType="next"
            containerStyle={styles.passwordRow}
          />
          <PasswordStrengthHints password={password} />

          <AppText style={styles.label}>MOBILE</AppText>
          <AppInput
            style={styles.input}
            value={formatMobileDisplay(mobileDigits)}
            onChangeText={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))}
            placeholder="0412 345 678"
            keyboardType="number-pad"
            maxLength={12}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <AppText style={styles.label}>TRADE / BUSINESS TYPE</AppText>
          <AppInput
            style={styles.input}
            value={trade}
            onChangeText={setTrade}
            placeholder="e.g. Plumbing, Electrical, Carpentry"
            autoCapitalize="words"
            returnKeyType="next"
          />

          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

          <TouchableOpacity
            style={[styles.primaryButton, (!canSubmit || loading) && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create account"
            accessibilityState={{ disabled: !canSubmit || loading }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <AppText style={styles.primaryButtonText}>Create account</AppText>
            )}
          </TouchableOpacity>

          <View style={styles.signInRow}>
            <AppText style={styles.signInBase}>Already have an account? </AppText>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/sign-in")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              <AppText style={styles.signInLink}>Sign in →</AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 24,
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.extraBold,
    color: Colors.black,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginBottom: 32,
    lineHeight: 22,
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.black,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    marginBottom: 20,
  },
  passwordRow: {
    marginBottom: 20,
  },
  abnSection: {
    gap: 8,
    marginBottom: 16,
  },
  abnInput: {
    marginBottom: 0,
  },
  abnWarning: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 6,
  },
  abnWarningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.amber,
    lineHeight: 17,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.red,
    textAlign: "center",
    marginBottom: 16,
  },
  primaryButton: {
    height: 54,
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  signInBase: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  signInLink: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
  searchByNameLink: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.vouchGreen,
  },
  nameSearchRow: {
    flexDirection: "row" as const,
    gap: 10,
    alignItems: "center" as const,
  },
  nameInput: {
    flex: 1,
  },
  nameSearchBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.vouchGreen,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  nameErrorText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.red,
  },
  resultsContainer: {
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 14,
    backgroundColor: Colors.white,
    overflow: "hidden" as const,
  },
  resultRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  resultRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey100,
  },
  resultName: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  resultMeta: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
});
