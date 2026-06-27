import { API_BASE_URL } from "@/constants/api";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { useAuth } from "@/context/AuthContext";
import { AppText } from "@/components/AppText";

type PendingProject = {
  _id: string;
  name: string;
  location: string;
  council: string;
  daNumber?: string;
  createdAt: string;
  creator: {
    name: string;
    email: string;
    role: string;
    hasLicence?: boolean | null;
    hasInsurance?: boolean | null;
  } | null;
  invitees: { email: string; role: string }[];
};

export default function AdminApprovals() {
  const { fetchWithAuth, isLoading: authLoading } = useAuth();

  const [projects, setProjects] = useState<PendingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function fetchPending() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/admin/projects/pending`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load pending projects.");
        return;
      }
      setProjects(data.projects ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(projectId: string) {
    setActioningId(projectId);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/admin/projects/${projectId}/approve`, {
        method: "PUT",
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p._id !== projectId));
      }
    } finally {
      setActioningId(null);
    }
  }

  async function doReject(projectId: string) {
    setActioningId(projectId);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/admin/projects/${projectId}/reject`, {
        method: "PUT",
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p._id !== projectId));
      }
    } finally {
      setActioningId(null);
    }
  }

  function handleReject(projectId: string) {
    if (Platform.OS === "web") {
      if (!window.confirm("Are you sure you want to reject this project?")) return;
      void doReject(projectId);
    } else {
      Alert.alert("Reject Project", "Are you sure you want to reject this project?", [
        { text: "Cancel", style: "cancel" },
        { text: "Reject", style: "destructive", onPress: () => void doReject(projectId) },
      ]);
    }
  }

  useEffect(() => {
    if (!authLoading) fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  return (
    <View style={styles.screen}>
      <View style={{ backgroundColor: Colors.vouchGreen }}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerInner}>
            <View>
              <AppText style={styles.adminBadge}>ADMIN CONSOLE</AppText>
              <AppText style={styles.headerTitle}>Approvals</AppText>
            </View>
            {!loading && projects.length > 0 && (
              <View style={styles.countBadge}>
                <AppText style={styles.countBadgeText}>{projects.length}</AppText>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <AppText style={styles.sectionLabel}>PENDING APPROVAL</AppText>

        {loading ? (
          <ActivityIndicator color={Colors.vouchGreen} style={{ marginTop: 32 }} />
        ) : error ? (
          <View style={styles.centerBox}>
            <AppText style={styles.errorText}>{error}</AppText>
            <TouchableOpacity
              onPress={fetchPending}
              style={styles.retryBtn}
              accessibilityRole="button"
              accessibilityLabel="Retry loading approvals"
            >
              <AppText style={styles.retryBtnText}>Retry</AppText>
            </TouchableOpacity>
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={Colors.green}
              style={{ marginBottom: 12 }}
            />
            <AppText style={styles.emptyTitle}>All clear</AppText>
            <AppText style={styles.emptyText}>No projects awaiting approval.</AppText>
          </View>
        ) : (
          projects.map((project) => {
            const isActioning = actioningId === project._id;
            return (
              <View key={project._id} style={styles.projectCard}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`View approval details for ${project.name}`}
                  onPress={() =>
                    router.push({
                      pathname: "/(admin)/approval/[id]",
                      params: {
                        id: project._id,
                        name: project.name,
                        location: project.location,
                        council: project.council,
                        daNumber: project.daNumber ?? "",
                        createdAt: project.createdAt,
                        creator: JSON.stringify(project.creator),
                        invitees: JSON.stringify(project.invitees),
                      },
                    })
                  }
                >
                  <View style={styles.cardTitleBlock}>
                    <AppText style={styles.projectName}>{project.name}</AppText>
                    <AppText style={styles.projectAddress}>{project.location}</AppText>
                    <AppText style={styles.projectDate}>
                      Submitted {new Date(project.createdAt).toLocaleDateString("en-AU")}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.grey300} />
                </TouchableOpacity>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, isActioning && styles.btnDisabled]}
                    onPress={() => handleReject(project._id)}
                    disabled={isActioning}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Reject ${project.name}`}
                    accessibilityState={{ disabled: isActioning }}
                  >
                    {isActioning ? (
                      <ActivityIndicator size="small" color={Colors.red} />
                    ) : (
                      <>
                        <Ionicons name="close" size={15} color={Colors.red} />
                        <AppText style={styles.rejectBtnText}>Reject</AppText>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.approveBtn, isActioning && styles.btnDisabled]}
                    onPress={() => handleApprove(project._id)}
                    disabled={isActioning}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Approve ${project.name}`}
                    accessibilityState={{ disabled: isActioning }}
                  >
                    {isActioning ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={15} color={Colors.white} />
                        <AppText style={styles.approveBtnText}>Approve</AppText>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.grey100 },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  adminBadge: {
    fontSize: 10,
    color: Colors.white,
    fontFamily: Fonts.semiBold,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headerTitle: { fontSize: 24, fontFamily: Fonts.extraBold, color: Colors.white },
  countBadge: {
    backgroundColor: Colors.amber,
    borderRadius: 20,
    minWidth: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  countBadgeText: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.black },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24 },
  sectionLabel: {
    fontSize: 12,
    color: Colors.grey500,
    fontFamily: Fonts.bold,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  projectCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cardTitleBlock: { flex: 1, marginRight: 8 },
  projectName: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.black, marginBottom: 3 },
  projectAddress: {
    fontSize: 13,
    color: Colors.grey500,
    fontFamily: Fonts.regular,
    marginBottom: 4,
  },
  projectDate: { fontSize: 12, color: Colors.grey500, fontFamily: Fonts.regular, marginBottom: 16 },
  actionRow: { flexDirection: "row", gap: 10 },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.red,
    borderRadius: 10,
    paddingVertical: 10,
  },
  rejectBtnText: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.red },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.vouchGreen,
    borderRadius: 10,
    paddingVertical: 10,
  },
  approveBtnText: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.white },
  btnDisabled: { opacity: 0.5 },
  centerBox: { alignItems: "center", marginTop: 32 },
  errorText: {
    fontSize: 14,
    color: Colors.red,
    fontFamily: Fonts.semiBold,
    textAlign: "center",
    marginBottom: 12,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: Colors.vouchGreen,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryBtnText: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.vouchGreen },
  emptyBox: { alignItems: "center", marginTop: 60 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.black, marginBottom: 6 },
  emptyText: { fontSize: 14, color: Colors.grey500, fontFamily: Fonts.regular },
});
