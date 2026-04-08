import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import { useAuth } from "@/context/AuthContext";
import CircularProgress from "@/components/CircularProgress";
import BabylonIcon from "@/components/BabylonIcon";

const ROLE_DISPLAY: Record<string, string> = { PM: "Project Manager", Subbie: "Subcontractor" };
function displayRole(role: string): string {
  return ROLE_DISPLAY[role] ?? role;
}

type Project = {
  id: string;
  name: string;
  subtitle: string;
  role: string;
  health: number;
  overdue: number;
  change: number;
};

type ApiProject = {
  _id: string;
  name: string;
  location: string;
  council: string;
  status: string;
  userRole?: string;
  healthScore?: number;
  overdueInvoiceCount?: number;
};

export default function Projects() {
  const { user, fetchWithAuth } = useAuth();
  const insets = useSafeAreaInsets();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedRole, setJoinedRole] = useState<string | null>(null);

  async function fetchProjects(silent = false) {
    if (!silent) setProjectsLoading(true);
    setProjectsError(null);
    try {
      const res = await fetchWithAuth("https://app-production-574c.up.railway.app/projects");
      const data = await res.json();
      if (!res.ok) {
        setProjectsError(data.error ?? "Failed to load projects.");
        return;
      }
      const mapped: Project[] = (data.projects as ApiProject[]).map((p) => ({
        id: p._id,
        name: p.name,
        subtitle: p.council,
        role: p.userRole ?? "Team Member",
        health: p.healthScore ?? 100,
        overdue: p.overdueInvoiceCount ?? 0,
        change: 0,
      }));
      setProjects(mapped);
    } catch {
      setProjectsError("Network error. Please try again.");
    } finally {
      setProjectsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchProjects(true);
    setRefreshing(false);
  }

  const avgHealth =
    projects.length > 0
      ? Math.round(projects.reduce((sum, p) => sum + p.health, 0) / projects.length)
      : 0;
  const totalOverdue = projects.reduce((sum, p) => sum + p.overdue, 0);

  function openJoinModal() {
    setJoinCode("");
    setJoinError(null);
    setJoinedRole(null);
    setJoinModalVisible(true);
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError(null);
    try {
      const res = await fetchWithAuth("https://app-production-574c.up.railway.app/project/accept", {
        method: "POST",
        body: JSON.stringify({ inviteCode: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error ?? "Invalid or expired invite code.");
      } else {
        setJoinedRole(data.participant?.role ?? "Team Member");
      }
    } catch {
      setJoinError("Network error. Please try again.");
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* ── Dark header ── */}
      <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.header}>
        <SafeAreaView edges={["top"]}>
          {/* Brand row */}
          <View style={styles.topRow}>
            <View style={styles.brandBlock}>
              <View style={styles.logoBox}>
                <BabylonIcon width={34} height={30} />
              </View>
              <View>
                <Text style={styles.brandLabel}>BABYLON NEXUS</Text>
                <Text style={styles.greeting}>Hey, {firstName} 👋</Text>
              </View>
            </View>
          </View>

          {/* Action buttons row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/(app)/create-project")}
            >
              <Ionicons name="add" size={15} color={Colors.navy} />
              <Text style={styles.actionBtnText}>New Project</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtnOutline}
              activeOpacity={0.8}
              onPress={openJoinModal}
            >
              <Ionicons name="enter-outline" size={15} color={Colors.gold} />
              <Text style={styles.actionBtnOutlineText}>Join Project</Text>
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{"PORTFOLIO\nHEALTH"}</Text>
              <View style={styles.statValueRow}>
                <Text style={[styles.statNum, { color: Colors.gold }]}>{avgHealth}%</Text>
                <Text style={[styles.statSuffix, { color: Colors.goldLight }]}> avg</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{"ACTIVE\nPROJECTS"}</Text>
              <View style={styles.statValueRow}>
                <Text style={[styles.statNum, { color: Colors.green }]}>{projects.length}</Text>
                <Text style={styles.statSuffix}> projects</Text>
              </View>
            </View>

            <View style={[styles.statCard, styles.statCardOverdue]}>
              <Text style={[styles.statLabel, { color: Colors.red }]}>OVERDUE</Text>
              <View style={styles.statValueRow}>
                <Text style={[styles.statNum, { color: Colors.red }]}>{totalOverdue}</Text>
                <Text style={[styles.statSuffix, { color: Colors.red }]}> invoices</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── Projects list ── */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.gold}
            colors={[Colors.gold]}
          />
        }
      >
        <Text style={styles.sectionLabel}>YOUR PROJECTS</Text>

        {projectsLoading ? (
          <ActivityIndicator color={Colors.gold} style={{ marginTop: 32 }} />
        ) : projectsError ? (
          <Text style={styles.errorText}>{projectsError}</Text>
        ) : projects.length === 0 ? (
          <Text style={styles.emptyText}>No active projects yet. Create or join one above.</Text>
        ) : (
          projects.map((project) => (
            <TouchableOpacity
              key={project.id}
              style={styles.projectCard}
              activeOpacity={0.75}
              onPress={() =>
                router.push({
                  pathname: "/(app)/project/[id]",
                  params: {
                    id: project.id,
                    name: project.name,
                  },
                })
              }
            >
              <CircularProgress value={project.health} size={68} />

              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectSubtitle}>{project.subtitle}</Text>

                <View style={styles.badgeRow}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{displayRole(project.role)}</Text>
                  </View>

                  {project.overdue > 0 && (
                    <View style={styles.overdueBadge}>
                      <Text style={styles.overdueBadgeText}>{project.overdue} overdue</Text>
                    </View>
                  )}

                  {project.change !== 0 && (
                    <Text
                      style={[
                        styles.changeBadge,
                        { color: project.change > 0 ? Colors.green : Colors.red },
                      ]}
                    >
                      {project.change > 0 ? "+" : ""}
                      {project.change}%
                    </Text>
                  )}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ── Join a Project modal ── */}
      <Modal visible={joinModalVisible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.joinScreen}>
          <LinearGradient
            colors={[Colors.navy, Colors.navyLight]}
            style={[styles.joinHeader, { paddingTop: insets.top }]}
          >
            <TouchableOpacity
              onPress={() => setJoinModalVisible(false)}
              style={styles.joinBackBtn}
              hitSlop={HEADER_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Close join project"
            >
              <Text style={styles.joinBackArrow}>‹</Text>
              <Text style={styles.joinBackLabel}>My Projects</Text>
            </TouchableOpacity>
            <Text style={styles.joinTitle}>{joinedRole ? "You're In!" : "Join a Project"}</Text>
          </LinearGradient>

          <ScrollView
            style={styles.joinBody}
            contentContainerStyle={styles.joinBodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {joinedRole ? (
              /* ── Success state ── */
              <View style={styles.joinSuccess}>
                <View style={styles.joinSuccessIcon}>
                  <Text style={{ fontSize: 36, color: Colors.green }}>✓</Text>
                </View>
                <Text style={styles.joinSuccessTitle}>{"You've joined!"}</Text>
                <Text style={styles.joinSuccessHint}>{"You've been added as"}</Text>
                <View style={styles.joinRoleBadge}>
                  <Text style={styles.joinRoleBadgeText}>{displayRole(joinedRole!)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.joinPrimaryBtn, { alignSelf: "stretch" }]}
                  onPress={() => {
                    setJoinModalVisible(false);
                    fetchProjects();
                  }}
                >
                  <Text style={styles.joinPrimaryBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── Input state ── */
              <>
                <Text style={styles.joinFieldLabel}>Invite Code</Text>
                <TextInput
                  style={styles.joinCodeInput}
                  value={joinCode}
                  onChangeText={(t) => setJoinCode(t.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                <Text style={styles.joinHint}>Enter the 6-digit code from your invite.</Text>

                {joinError && <Text style={styles.joinError}>{joinError}</Text>}

                <TouchableOpacity
                  style={[
                    styles.joinPrimaryBtn,
                    (joinCode.length < 6 || joinLoading) && styles.joinPrimaryBtnDisabled,
                  ]}
                  onPress={handleJoin}
                  disabled={joinCode.length < 6 || joinLoading}
                >
                  {joinLoading ? (
                    <ActivityIndicator color={Colors.navy} />
                  ) : (
                    <Text
                      style={[
                        styles.joinPrimaryBtnText,
                        joinCode.length < 6 && styles.joinPrimaryBtnTextDisabled,
                      ]}
                    >
                      Join Project
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },

  // Header
  header: {
    paddingBottom: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.navyIcon,
    alignItems: "center",
    justifyContent: "center",
  },
brandLabel: {
    fontSize: 10,
    color: Colors.goldLight,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  greeting: {
    fontSize: 20,
    color: Colors.white,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 10,
  },
  actionBtnText: {
    color: Colors.navy,
    fontWeight: "700",
    fontSize: 13,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 10,
  },
  actionBtnOutlineText: {
    color: Colors.gold,
    fontWeight: "700",
    fontSize: 13,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    minHeight: 92,
    justifyContent: "space-between",
  },
  statCardOverdue: {
    backgroundColor: Colors.red + "2E",
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    lineHeight: 15,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 6,
  },
  statNum: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.white,
    lineHeight: 26,
  },
  statSuffix: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 2,
  },

  // Body
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

  errorText: {
    fontSize: 14,
    color: Colors.red,
    textAlign: "center",
    marginTop: 32,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 32,
    paddingHorizontal: 16,
  },

  // Project cards
  projectCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  projectInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 4,
  },
  projectName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  projectSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  roleBadge: {
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 11,
    color: Colors.gold,
    fontWeight: "600",
  },
  overdueBadge: {
    backgroundColor: Colors.redBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  overdueBadgeText: {
    fontSize: 11,
    color: Colors.red,
    fontWeight: "600",
  },
  changeBadge: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Join a Project modal
  joinScreen: { flex: 1, backgroundColor: Colors.navy },
  joinHeader: { paddingBottom: 20 },
  joinBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    minWidth: 44,
    marginBottom: 8,
    direction: "ltr",
  },
  joinBackArrow: { fontSize: 20, color: "rgba(255,255,255,0.5)" },
  joinBackLabel: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "500" },
  joinTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.white,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  joinBody: { flex: 1, backgroundColor: Colors.navy },
  joinBodyContent: { padding: 24, paddingBottom: 48 },
  joinFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.goldLight,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  joinCodeInput: {
    height: 72,
    borderWidth: 1.5,
    borderColor: Colors.gold + "40",
    borderRadius: 14,
    paddingHorizontal: 24,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 10,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    color: Colors.gold,
    textAlign: "center",
  },
  joinHint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    marginBottom: 32,
  },
  joinError: {
    fontSize: 13,
    color: Colors.red,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  joinPrimaryBtn: {
    height: 54,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  joinPrimaryBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  joinPrimaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.navy,
    letterSpacing: 0.5,
  },
  joinPrimaryBtnTextDisabled: {
    color: "rgba(255,255,255,0.3)",
  },

  // Join success state
  joinSuccess: { alignItems: "center", paddingTop: 40 },
  joinSuccessIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.green + "26",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  joinSuccessTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: 8,
  },
  joinSuccessHint: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 12,
  },
  joinRoleBadge: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 24,
  },
  joinRoleBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.gold,
  },
  joinSuccessNote: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 16,
  },
});
