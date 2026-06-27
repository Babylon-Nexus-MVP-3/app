import { useState, useCallback } from "react";
import { useFocusEffect, router } from "expo-router";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import { formatAbn } from "@/lib/useAbrLookup";

type VouchRequest = {
  _id: string;
  fromName: string;
  fromCompany: string;
  fromAbn?: string;
  relationship: string;
  projectName: string;
  createdAt: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hrs ago`;
  if (hrs < 48) return "yesterday";
  return `${Math.floor(hrs / 24)} days ago`;
}

function nameInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [Colors.vouchGreen, "#5C6BC0", "#00897B", "#6D4C41", "#546E7A"];

function Avatar({ name, index }: { name: string; index: number }) {
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <View style={[styles.avatar, { backgroundColor: bg }]}>
      <AppText style={styles.avatarText}>{nameInitials(name)}</AppText>
    </View>
  );
}

type SearchResult = {
  abn: string;
  entityName: string;
  state: string;
};

export default function GiveAVouchScreen() {
  const { fetchWithAuth, user } = useAuth();
  const [requests, setRequests] = useState<VouchRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [ignoring, setIgnoring] = useState<string | null>(null);
  const [abn, setAbn] = useState("");
  const [abnError, setAbnError] = useState("");
  const [checking, setChecking] = useState(false);
  const [activeTab, setActiveTab] = useState<"abn" | "name">("abn");
  const [nameQuery, setNameQuery] = useState("");
  const [nameResults, setNameResults] = useState<SearchResult[]>([]);
  const [nameSearching, setNameSearching] = useState(false);
  const [nameError, setNameError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/vouch/pending-requests`);
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch {
      setRequests([]);
    }
  }, [fetchWithAuth]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onIgnore(id: string) {
    setIgnoring(id);
    try {
      await fetchWithAuth(`${API_BASE_URL}/vouch/requests/${id}/ignore`, { method: "PATCH" });
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch {
      // silently fail — list unchanged
    } finally {
      setIgnoring(null);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function onAbnChange(raw: string) {
    setAbn(formatAbn(raw));
    setAbnError("");
  }

  async function proceedWithAbn(digits: string) {
    if (digits === user?.abn) {
      setAbnError("You can't vouch for your own business.");
      return;
    }
    setChecking(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/vouch/business/${digits}`);
      if (res.ok) {
        const data = await res.json();
        if (data.alreadyVouched) {
          setAbnError("You've already vouched for this business.");
          return;
        }
      }
    } catch {
      // proceed to verify regardless
    } finally {
      setChecking(false);
    }
    router.push(`/(app)/give-vouch/verify?abn=${digits}`);
  }

  async function onLookup() {
    const digits = abn.replace(/\D/g, "");
    if (digits.length !== 11) {
      setAbnError("Please enter a valid 11-digit ABN");
      return;
    }
    if (digits === user?.abn) {
      setAbnError("You can't vouch for your own business.");
      return;
    }
    setChecking(true);
    let canProceed = true;
    try {
      const [abrRes, statusRes] = await Promise.all([
        fetch(`${API_BASE_URL}/abr/lookup?abn=${digits}`),
        fetchWithAuth(`${API_BASE_URL}/vouch/business/${digits}`).catch(() => null),
      ]);
      if (!abrRes.ok) {
        if (abrRes.status >= 500) {
          // ABR service down — ABN format is valid, let verify screen handle the rest
        } else if (abrRes.status === 410) {
          setAbnError(
            "This ABN has been cancelled. You can only vouch for businesses with an active ABN."
          );
          canProceed = false;
        } else {
          setAbnError("ABN not found. Check the number and try again.");
          canProceed = false;
        }
      } else {
        const abrData = await abrRes.json();
        if (!abrData.isActive) {
          setAbnError("This ABN is not currently active.");
          canProceed = false;
        }
      }
      if (canProceed && statusRes?.ok) {
        const statusData = await statusRes.json();
        if (statusData.alreadyVouched) {
          setAbnError("You've already vouched for this business.");
          canProceed = false;
        }
      }
    } catch {
      // network error — let verify screen handle it
    } finally {
      setChecking(false);
    }
    if (canProceed) {
      router.push(`/(app)/give-vouch/verify?abn=${digits}`);
    }
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
      const res = await fetchWithAuth(`${API_BASE_URL}/abr/search?name=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setNameError(
          res.status >= 500
            ? "Business search is temporarily unavailable. Try searching by ABN."
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>GIVE A VOUCH</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.vouchGreen}
          />
        }
      >
        <AppText style={styles.pageTitle}>Vouch for someone</AppText>

        {/* Pending requests */}
        <AppText style={styles.sectionLabel}>
          PENDING REQUESTS{requests.length > 0 ? ` · ${requests.length}` : ""}
        </AppText>

        {requests.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="time-outline" size={20} color={Colors.grey500} />
            <AppText style={styles.emptyText}>No pending requests right now.</AppText>
          </View>
        ) : (
          requests.map((r, i) => (
            <View key={r._id}>
              <TouchableOpacity
                style={styles.requestCard}
                activeOpacity={0.75}
                onPress={() =>
                  router.push(`/(app)/give-vouch/verify?abn=${r.fromAbn ?? ""}&requestId=${r._id}`)
                }
                accessibilityRole="button"
                accessibilityLabel={`Vouch request from ${r.fromCompany} · ${r.fromName}`}
              >
                <Avatar name={r.fromName} index={i} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText style={styles.requestCompany}>{r.fromCompany}</AppText>
                  <AppText style={styles.requestMeta}>
                    {r.fromName} · {timeAgo(r.createdAt)}
                  </AppText>
                  {r.relationship || r.projectName ? (
                    <AppText style={styles.requestRelationship}>
                      {[r.relationship, r.projectName].filter(Boolean).join(" · ")}
                    </AppText>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.grey500} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ignoreBtn}
                onPress={() => onIgnore(r._id)}
                disabled={ignoring === r._id}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Ignore vouch request from ${r.fromCompany}`}
                accessibilityState={{ disabled: ignoring === r._id }}
              >
                <AppText style={styles.ignoreText}>
                  {ignoring === r._id ? "Ignoring…" : "Ignore"}
                </AppText>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.divider} />

        {/* Vouch a business */}
        <AppText style={styles.newTitle}>Vouch a business</AppText>
        <AppText style={styles.newSubtitle}>
          {activeTab === "abn"
            ? "Enter their ABN. We'll verify it instantly."
            : "Search by business name to find their ABN."}
        </AppText>

        {activeTab === "abn" && (
          <>
            <View style={styles.labelRow}>
              <AppText style={styles.abnLabel}>ABN</AppText>
              <TouchableOpacity
                onPress={() => setActiveTab("name")}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Search by name instead"
              >
                <AppText style={styles.switchLink}>Search by name →</AppText>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.abnInput, abnError ? styles.abnInputError : null]}
              value={abn}
              onChangeText={onAbnChange}
              placeholder="XX XXX XXX XXX"
              placeholderTextColor={Colors.grey300}
              keyboardType="numeric"
              returnKeyType="go"
              onSubmitEditing={onLookup}
            />
            {abnError ? <AppText style={styles.abnErrorText}>{abnError}</AppText> : null}

            <TouchableOpacity
              style={[styles.lookupBtn, checking && { opacity: 0.7 }]}
              onPress={onLookup}
              disabled={checking}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Look up ABN"
              accessibilityState={{ disabled: checking }}
            >
              {checking ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <AppText style={styles.lookupBtnText}>Look up ABN</AppText>
              )}
            </TouchableOpacity>

            <View style={styles.verifiedNote}>
              <Ionicons name="shield-checkmark-outline" size={13} color={Colors.grey500} />
              <AppText style={styles.verifiedNoteText}>
                Verified with the Australian Business Register. We never search our user list.
              </AppText>
            </View>
          </>
        )}

        {activeTab === "name" && (
          <>
            <View style={styles.labelRow}>
              <AppText style={styles.abnLabel}>BUSINESS NAME</AppText>
              <TouchableOpacity
                onPress={() => setActiveTab("abn")}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Enter ABN instead"
              >
                <AppText style={styles.switchLink}>← Enter ABN instead</AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.nameSearchRow}>
              <TextInput
                style={styles.nameInput}
                value={nameQuery}
                onChangeText={(t) => {
                  setNameQuery(t);
                  setNameError("");
                }}
                placeholder="Search by business name"
                placeholderTextColor={Colors.grey300}
                returnKeyType="search"
                onSubmitEditing={onNameSearch}
                autoCapitalize="words"
              />
              <TouchableOpacity
                style={styles.nameSearchBtn}
                onPress={onNameSearch}
                activeOpacity={0.85}
                disabled={nameSearching}
                accessibilityRole="button"
                accessibilityLabel="Search businesses by name"
                accessibilityState={{ disabled: nameSearching }}
              >
                {nameSearching ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Ionicons name="search" size={18} color={Colors.white} />
                )}
              </TouchableOpacity>
            </View>

            {nameError ? <AppText style={styles.abnErrorText}>{nameError}</AppText> : null}

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
                    onPress={() => proceedWithAbn(item.abn)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${item.entityName}, ABN ${formatAbn(item.abn)}`}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    letterSpacing: 1,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  emptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  requestCompany: {
    fontSize: 17,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  requestMeta: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  requestRelationship: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.vouchGreen,
  },
  ignoreBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginTop: -4,
    marginBottom: 4,
  },
  ignoreText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.grey500,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.grey300,
    marginVertical: 8,
  },
  newTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  newSubtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginTop: -4,
  },
  abnLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 4,
  },
  abnInput: {
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    height: 54,
    paddingHorizontal: 16,
    fontSize: 17,
    fontFamily: Fonts.regular,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  abnInputError: { borderColor: Colors.red },
  abnErrorText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.red,
    marginTop: -4,
  },
  lookupBtn: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  lookupBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  verifiedNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: -4,
  },
  verifiedNoteText: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    lineHeight: 18,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLink: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.vouchGreen,
  },
  nameSearchRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  nameSearchBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.vouchGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  resultsContainer: {
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 14,
    backgroundColor: Colors.white,
    overflow: "hidden",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  resultRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey100,
  },
  resultName: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  resultMeta: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
});
