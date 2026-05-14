import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
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
      <Text style={styles.avatarText}>{nameInitials(name)}</Text>
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

export default function VouchesScreen() {
  const { fetchWithAuth } = useAuth();
  const [requests, setRequests] = useState<VouchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [abn, setAbn] = useState("");
  const [abnError, setAbnError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/vouch/pending-requests`);
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    load();
  }, [load]);

  function onAbnChange(raw: string) {
    setAbn(formatAbn(raw));
    setAbnError("");
  }

  function onLookup() {
    const digits = abn.replace(/\D/g, "");
    if (digits.length !== 11) {
      setAbnError("Please enter a valid 11-digit ABN");
      return;
    }
    router.push(`/(app)/give-vouch/verify?abn=${digits}`);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vouch for someone</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Pending requests */}
        <Text style={styles.sectionLabel}>
          PENDING REQUESTS{requests.length > 0 ? ` · ${requests.length}` : ""}
        </Text>

        {loading ? (
          <ActivityIndicator color={Colors.vouchGreen} style={{ marginVertical: 20 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="time-outline" size={20} color={Colors.grey500} />
            <Text style={styles.emptyText}>No pending requests right now.</Text>
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
                <Text style={styles.requestCompany}>{r.fromCompany}</Text>
                <Text style={styles.requestMeta}>
                  {r.fromName} · {timeAgo(r.createdAt)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.grey500} />
            </TouchableOpacity>
          ))
        )}

        <View style={styles.divider} />

        {/* Vouch a new business */}
        <Text style={styles.newTitle}>Vouch a new business</Text>
        <Text style={styles.newSubtitle}>{"Enter their ABN. We'll verify it instantly."}</Text>

        <Text style={styles.abnLabel}>ABN</Text>
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
        {abnError ? <Text style={styles.abnErrorText}>{abnError}</Text> : null}

        <TouchableOpacity style={styles.lookupBtn} onPress={onLookup} activeOpacity={0.85}>
          <Text style={styles.lookupBtnText}>Look up ABN</Text>
        </TouchableOpacity>

        <View style={styles.verifiedNote}>
          <Ionicons name="shield-checkmark-outline" size={13} color={Colors.grey500} />
          <Text style={styles.verifiedNoteText}>
            Verified with the Australian Business Register. We never search our user list.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => router.push("/(app)/give-vouch/manual")}
          activeOpacity={0.7}
        >
          <Text style={styles.manualText}>
            {"Don't have their ABN? "}
            <Text style={styles.manualLink}>Add manually →</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.black,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
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
    fontWeight: "700",
    color: Colors.white,
  },
  requestCompany: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.black,
  },
  requestMeta: {
    fontSize: 13,
    color: Colors.grey500,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.grey300,
    marginVertical: 8,
  },
  newTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.black,
  },
  newSubtitle: {
    fontSize: 14,
    color: Colors.grey500,
    marginTop: -4,
  },
  abnLabel: {
    fontSize: 11,
    fontWeight: "700",
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
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  abnInputError: {
    borderColor: Colors.red,
  },
  abnErrorText: {
    fontSize: 12,
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
    fontWeight: "700",
  },
  verifiedNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: -4,
  },
  verifiedNoteText: {
    fontSize: 12,
    color: Colors.grey500,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
    alignItems: "center",
  },
  manualText: {
    fontSize: 14,
    color: Colors.grey700,
    textAlign: "center",
  },
  manualLink: {
    color: Colors.vouchGreen,
    fontWeight: "600",
  },
});
