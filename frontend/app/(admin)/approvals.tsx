import { API_BASE_URL } from "@/constants/api";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

type PendingProject = {
  _id: string;
  name: string;
  location: string;
  council: string;
  createdAt: string;
  creator: { name: string; email: string; role: string } | null;
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

  function handleReject(projectId: string) {
    Alert.alert("Reject Project", "Are you sure you want to reject this project?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
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
        },
      },
    ]);
  }

  useEffect(() => {
    if (!authLoading) fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.header}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.adminBadge}>ADMIN CONSOLE</Text>
              <Text style={styles.headerTitle}>Approvals</Text>
            </View>
            {!loading && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{projects.length}</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>PENDING APPROVAL</Text>

        {loading ? (
          <ActivityIndicator color={Colors.gold} style={{ marginTop: 32 }} />
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchPending} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
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
            <Text style={styles.emptyTitle}>All clear</Text>
            <Text style={styles.emptyText}>No projects awaiting approval.</Text>
          </View>
        ) : (
          projects.map((project) => {
            const isActioning = actioningId === project._id;
            return (
              <View key={project._id} style={styles.projectCard}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/(admin)/approval/[id]",
                      params: {
                        id: project._id,
                        name: project.name,
                        location: project.location,
                        createdAt: project.createdAt,
                        creator: JSON.stringify(project.creator),
                        invitees: JSON.stringify(project.invitees),
                      },
                    })
                  }
                >
                  <View style={styles.cardTitleBlock}>
                    <Text style={styles.projectName}>{project.name}</Text>
                    <Text style={styles.projectAddress}>{project.location}</Text>
                    <Text style={styles.projectDate}>
                      Submitted {new Date(project.createdAt).toLocaleDateString("en-AU")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, isActioning && styles.btnDisabled]}
                    onPress={() => handleReject(project._id)}
                    disabled={isActioning}
                    activeOpacity={0.75}
                  >
                    {isActioning ? (
                      <ActivityIndicator size="small" color={Colors.red} />
                    ) : (
                      <>
                        <Ionicons name="close" size={15} color={Colors.red} />
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.approveBtn, isActioning && styles.btnDisabled]}
                    onPress={() => handleApprove(project._id)}
                    disabled={isActioning}
                    activeOpacity={0.75}
                  >
                    {isActioning ? (
                      <ActivityIndicator size="small" color={Colors.navy} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={15} color={Colors.navy} />
                        <Text style={styles.approveBtnText}>Approve</Text>
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
  screen: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  header: {
    paddingBottom: 20,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  adminBadge: {
    fontSize: 10,
    color: Colors.goldLight,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.white,
  },
  countBadge: {
    backgroundColor: Colors.amber,
    borderRadius: 20,
    minWidth: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  countBadgeText: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.navy,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  projectCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
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
  cardTitleBlock: {
    flex: 1,
    marginRight: 8,
  },
  projectName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  projectAddress: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  projectDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
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
  rejectBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.red,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.green,
    borderRadius: 10,
    paddingVertical: 10,
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.navy,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  centerBox: {
    alignItems: "center",
    marginTop: 32,
  },
  errorText: {
    fontSize: 14,
    color: Colors.red,
    textAlign: "center",
    marginBottom: 12,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.gold,
  },
  emptyBox: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
