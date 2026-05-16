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

function formatAbn(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

type SearchResult = {
  abn: string;
  entityName: string;
  state: string;
};

export default function VouchesScreen() {
  const { fetchWithAuth } = useAuth();
  const [requests, setRequests] = useState<VouchRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [abn, setAbn] = useState("");
  const [abnError, setAbnError] = useState("");
  const [checking, setChecking] = useState(false);
  const [showNameSearch, setShowNameSearch] = useState(false);
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

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function onAbnChange(raw: string) {
    setAbn(formatAbn(raw));
    setAbnError("");
  }

  async function onLookup() {
    const digits = abn.replace(/\D/g, "");
    if (digits.length !== 11) {
      setAbnError("Please enter a valid 11-digit ABN");
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
      // network issue — let verify screen handle it
    } finally {
      setChecking(false);
    }
    router.push(`/(app)/give-vouch/verify?abn=${digits}`);
  }

  function toggleNameSearch() {
    setShowNameSearch((prev) => !prev);
    setNameQuery("");
    setNameResults([]);
    setNameError("");
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
      const res = await fetchWithAuth(
        `${API_BASE_URL}/abr/search?name=${encodeURIComponent(q)}`
      );
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
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
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
            <TouchableOpacity
              key={r._id}
              style={styles.requestCard}
              activeOpacity={0.7}
              onPress={() =>
                router.push(`/(app)/give-vouch/verify?abn=${r.fromAbn ?? ""}&requestId=${r._id}`)
              }
            >
              <Avatar name={r.fromName} index={i} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText style={styles.requestCompany}>{r.fromCompany}</AppText>
                <AppText style={styles.requestMeta}>
                  {r.fromName} · {timeAgo(r.createdAt)}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.grey500} />
            </TouchableOpacity>
          ))
        )}

        <View style={styles.divider} />

        {/* Vouch a new business */}
        <AppText style={styles.newTitle}>Vouch a new business</AppText>
        <AppText style={styles.newSubtitle}>
          {"Enter their ABN. We'll verify it instantly."}
        </AppText>

        {!showNameSearch && (
          <>
            <AppText style={styles.abnLabel}>ABN</AppText>
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

        {showNameSearch && (
          <>
            <AppText style={styles.abnLabel}>BUSINESS NAME</AppText>
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
                    activeOpacity={0.7}
                    onPress={() => router.push(`/(app)/give-vouch/verify?abn=${item.abn}`)}
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

      <TouchableOpacity onPress={toggleNameSearch} style={styles.toggleSearchLink} activeOpacity={0.7}>
        {showNameSearch ? (
          <AppText style={styles.toggleSearchText}>
            <AppText style={styles.toggleSearchUnderline}>Search by ABN instead</AppText>
          </AppText>
        ) : (
          <AppText style={styles.toggleSearchText}>
            {"Don't have their ABN? "}
            <AppText style={styles.toggleSearchUnderline}>Add it manually</AppText>
          </AppText>
        )}
      </TouchableOpacity>
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
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    letterSpacing: 1,
  },
  pageTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
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
    fontSize: 14,
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
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  requestMeta: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.grey300,
    marginVertical: 8,
  },
  newTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  newSubtitle: {
    fontSize: 14,
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
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  abnInputError: {
    borderColor: Colors.red,
  },
  abnErrorText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.red,
    marginTop: -4,
  },
  lookupBtn: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  lookupBtnText: {
    color: Colors.white,
    fontSize: 15,
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
  toggleSearchLink: {
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: Colors.white,
  },
  toggleSearchText: {
    fontSize: 13,
    color: Colors.grey500,
    fontWeight: "400",
  },
  toggleSearchUnderline: {
    color: Colors.vouchGreen,
    fontWeight: "600",
    textDecorationLine: "underline",
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
    fontSize: 14,
    fontWeight: "600",
    color: Colors.black,
  },
  resultMeta: {
    fontSize: 12,
    color: Colors.grey500,
  },
});
