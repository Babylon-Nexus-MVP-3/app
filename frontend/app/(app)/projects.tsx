import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import CircularProgress from "@/components/CircularProgress";

type Project = {
  id: string;
  name: string;
  subtitle: string;
  role: string;
  health: number;
  overdue: number;
  change: number;
};

// TODO: Replace with API data
const PROJECTS: Project[] = [
  {
    id: "1",
    name: "Strathfield Apartments",
    subtitle: "24 Units — Strathfield NSW",
    role: "Subcontractor",
    health: 78,
    overdue: 2,
    change: 5,
  },
  {
    id: "2",
    name: "Parramatta Tower",
    subtitle: "18 Levels — Parramatta NSW",
    role: "Builder",
    health: 65,
    overdue: 3,
    change: -3,
  },
  {
    id: "3",
    name: "Bankstown Mixed-Use",
    subtitle: "45 Units — Bankstown NSW",
    role: "Owner",
    health: 45,
    overdue: 5,
    change: -12,
  },
  {
    id: "69b50f3722334dcf9244c2b2",
    name: "Burwood Central",
    subtitle: "12 Units — Burwood NSW",
    role: "Project Manager",
    health: 92,
    overdue: 0,
    change: 8,
  },
];

export default function Projects() {
  const { user, fetchWithAuth } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const avgHealth = Math.round(PROJECTS.reduce((sum, p) => sum + p.health, 0) / PROJECTS.length);
  const totalOverdue = PROJECTS.reduce((sum, p) => sum + p.overdue, 0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedRole, setJoinedRole] = useState<string | null>(null);

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
      const res = await fetchWithAuth("http://localhost:3229/project/join/accept", {
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
                <Text style={styles.logoEmoji}>🏛</Text>
              </View>
              <View>
                <Text style={styles.brandLabel}>BABYLON NEXUS</Text>
                <Text style={styles.greeting}>Hey {firstName} 👋</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.projectMenuBtn}
              activeOpacity={0.8}
              onPress={() => setMenuOpen((o) => !o)}
            >
              <Text style={styles.projectMenuBtnText}>+ Project</Text>
              <Ionicons
                name={menuOpen ? "chevron-up" : "chevron-down"}
                size={13}
                color={Colors.gold}
                style={{ marginLeft: 4 }}
              />
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
                <Text style={styles.statNum}>{PROJECTS.length}</Text>
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
      >
        <Text style={styles.sectionLabel}>YOUR PROJECTS</Text>

        {PROJECTS.map((project) => (
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
                  subtitle: project.subtitle,
                  role: project.role,
                  health: String(project.health),
                  overdue: String(project.overdue),
                  change: String(project.change),
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
                  <Text style={styles.roleBadgeText}>{project.role}</Text>
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
        ))}
      </ScrollView>

      {/* ── Project menu dropdown ── */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="none"
        onRequestClose={() => setMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setMenuOpen(false);
                router.push("/(app)/create-project");
              }}
            >
              <Text style={styles.dropdownItemText}>New Project</Text>
            </TouchableOpacity>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setMenuOpen(false);
                openJoinModal();
              }}
            >
              <Text style={styles.dropdownItemText}>Join a Project</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Join a Project modal ── */}
      <Modal visible={joinModalVisible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.joinScreen}>
          <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.joinHeader}>
            <SafeAreaView edges={["top"]}>
              <TouchableOpacity
                onPress={() => setJoinModalVisible(false)}
                style={styles.joinBackBtn}
              >
                <Text style={styles.joinBackArrow}>‹</Text>
                <Text style={styles.joinBackLabel}>My Projects</Text>
              </TouchableOpacity>
              <Text style={styles.joinTitle}>{joinedRole ? "You're In!" : "Join a Project"}</Text>
            </SafeAreaView>
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
                  <Text style={styles.joinRoleBadgeText}>{joinedRole}</Text>
                </View>
                <Text style={styles.joinSuccessNote}>
                  The project will appear in your list once real project data is connected.
                </Text>
                <TouchableOpacity
                  style={[styles.joinPrimaryBtn, { alignSelf: "stretch" }]}
                  onPress={() => setJoinModalVisible(false)}
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
  logoEmoji: {
    fontSize: 24,
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
  projectMenuBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  projectMenuBtnText: {
    color: Colors.gold,
    fontWeight: "700",
    fontSize: 13,
  },
  dropdownBackdrop: {
    flex: 1,
  },
  dropdownMenu: {
    position: "absolute",
    top: 56,
    right: 20,
    backgroundColor: Colors.white,
    borderRadius: 12,
    minWidth: 160,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  dropdownItemText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.07)",
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
    color: Colors.textSecondary,
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
    fontSize: 28,
    fontWeight: "800",
    color: Colors.white,
    lineHeight: 32,
  },
  statSuffix: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
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
    gap: 4,
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 8,
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
