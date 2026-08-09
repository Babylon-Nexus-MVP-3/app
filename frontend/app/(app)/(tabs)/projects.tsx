import { API_BASE_URL } from "@/constants/api";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { Spacing } from "@/constants/spacing";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import { useAuth } from "@/context/AuthContext";
import { appStyles } from "@/constants/appStyles";
import { AppText } from "@/components/AppText";
import CircularProgress from "@/components/CircularProgress";
import { useVouchProfile } from "@/lib/useVouchProfile";
import { displayRole } from "@/components/project/helpers";

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
  const { fetchWithAuth } = useAuth();
  const insets = useSafeAreaInsets();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // This tab used to re-derive completeness from the raw profile, checking the
  // VouchProfile's `trade` where the server checks the User's `businessTrade`.
  // Someone who signed up but never opened the wizard was unlocked on Home and
  // locked here. One source now answers both.
  const { isComplete } = useVouchProfile();
  const canCreateProject = isComplete !== false;

  const addBtnRef = useRef<View>(null);
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const [addMenuTop, setAddMenuTop] = useState(60);

  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedRole, setJoinedRole] = useState<string | null>(null);
  const [joinHasLicence, setJoinHasLicence] = useState<boolean | null>(null);
  const [joinHasInsurance, setJoinHasInsurance] = useState<boolean | null>(null);

  async function fetchProjects(silent = false) {
    if (!silent) setProjectsLoading(true);
    setProjectsError(null);
    try {
      const projectsRes = await fetchWithAuth(`${API_BASE_URL}/projects`);
      const data = await projectsRes.json();
      if (!projectsRes.ok) {
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
    setJoinHasLicence(null);
    setJoinHasInsurance(null);
    setJoinModalVisible(true);
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/project/accept`, {
        method: "POST",
        body: JSON.stringify({
          inviteCode: joinCode.trim(),
          hasLicence: joinHasLicence,
          hasInsurance: joinHasInsurance,
        }),
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
    <View style={appStyles.screen}>
      {/* ── Header ── */}
      <View style={[appStyles.header, styles.headerTaller]}>
        <SafeAreaView edges={["top"]}>
          {/* Header row */}
          <View style={[appStyles.headerInner, styles.topRow]}>
            <AppText style={appStyles.headerTitle}>My Projects</AppText>
            <TouchableOpacity
              ref={addBtnRef}
              style={appStyles.headerIconBtn}
              hitSlop={HEADER_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Create or join a project"
              onPress={() => {
                addBtnRef.current?.measure(
                  (_x: number, _y: number, _w: number, h: number, _px: number, py: number) => {
                    setAddMenuTop(py + h + 4);
                  }
                );
                setAddMenuVisible(true);
              }}
            >
              <Ionicons name="add" size={26} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Stat chips */}
          <View style={appStyles.statsRow}>
            <View style={appStyles.statChip}>
              <AppText style={appStyles.statChipLabel}>{"PORTFOLIO\nHEALTH"}</AppText>
              <View style={styles.statValueRow}>
                <AppText style={appStyles.statChipNum}>{avgHealth}%</AppText>
                <AppText style={appStyles.statChipSuffix}> avg</AppText>
              </View>
            </View>

            <View style={appStyles.statChip}>
              <AppText style={appStyles.statChipLabel}>{"ACTIVE\nPROJECTS"}</AppText>
              <View style={styles.statValueRow}>
                <AppText style={appStyles.statChipNum}>{projects.length}</AppText>
                <AppText style={appStyles.statChipSuffix}> projects</AppText>
              </View>
            </View>

            <View style={[appStyles.statChip, totalOverdue > 0 && appStyles.statChipAlert]}>
              <AppText style={appStyles.statChipLabel}>OVERDUE</AppText>
              <View style={styles.statValueRow}>
                <AppText style={[appStyles.statChipNum, totalOverdue > 0 && styles.overdueNum]}>
                  {totalOverdue}
                </AppText>
                <AppText style={[appStyles.statChipSuffix, totalOverdue > 0 && styles.overdueNum]}>
                  {" "}
                  invoices
                </AppText>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ── Projects list ── */}
      <FlatList
        style={appStyles.body}
        contentContainerStyle={appStyles.bodyContent}
        showsVerticalScrollIndicator={false}
        data={projectsLoading || projectsError ? [] : projects}
        keyExtractor={(p) => p.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.vouchGreen}
            colors={[Colors.vouchGreen]}
          />
        }
        ListHeaderComponent={<AppText style={appStyles.sectionLabel}>YOUR PROJECTS</AppText>}
        ListEmptyComponent={
          projectsLoading ? (
            <ActivityIndicator color={Colors.vouchGreen} style={{ marginTop: 32 }} />
          ) : projectsError ? (
            <AppText style={appStyles.errorText}>{projectsError}</AppText>
          ) : (
            <AppText style={appStyles.emptyText}>
              No active projects yet. Create or join one above.
            </AppText>
          )
        }
        renderItem={({ item: project }) => (
          <TouchableOpacity
            style={[appStyles.card, styles.projectCard]}
            activeOpacity={0.75}
            onPress={() =>
              router.push({
                pathname: "/(app)/project/[id]",
                params: { id: project.id, name: project.name },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`${project.name}, ${displayRole(project.role)}, health ${project.health}%${project.overdue > 0 ? `, ${project.overdue} overdue` : ""}`}
          >
            <CircularProgress value={project.health} size={68} />

            <View style={styles.projectInfo}>
              <AppText style={styles.projectName}>{project.name}</AppText>
              <AppText style={styles.projectSubtitle}>{project.subtitle}</AppText>

              <View style={styles.badgeRow}>
                <View style={appStyles.roleBadge}>
                  <AppText style={appStyles.roleBadgeText}>{displayRole(project.role)}</AppText>
                </View>

                {project.overdue > 0 && (
                  <View style={appStyles.overdueBadge}>
                    <AppText style={appStyles.overdueBadgeText}>{project.overdue} overdue</AppText>
                  </View>
                )}

                {project.change !== 0 && (
                  <AppText
                    style={[
                      styles.changeBadge,
                      { color: project.change > 0 ? Colors.vouchGreen : Colors.red },
                    ]}
                  >
                    {project.change > 0 ? "+" : ""}
                    {project.change}%
                  </AppText>
                )}
              </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color={Colors.grey300} />
          </TouchableOpacity>
        )}
      />

      {/* ── Create/Join menu ── */}
      <Modal visible={addMenuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setAddMenuVisible(false)}
        >
          <View style={[styles.menu, { top: addMenuTop }]}>
            <TouchableOpacity
              style={styles.menuItem}
              accessibilityRole="button"
              accessibilityLabel={
                canCreateProject
                  ? "Create new project"
                  : "Create new project, complete profile first"
              }
              onPress={() => {
                setAddMenuVisible(false);
                if (canCreateProject) {
                  router.push("/(app)/create-project");
                } else {
                  router.push("/(app)/project-locked");
                }
              }}
            >
              <AppText style={styles.menuItemText}>New Project</AppText>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              accessibilityRole="button"
              accessibilityLabel="Join a project"
              onPress={() => {
                setAddMenuVisible(false);
                openJoinModal();
              }}
            >
              <AppText style={styles.menuItemText}>Join Project</AppText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Join a Project modal ── */}
      <Modal visible={joinModalVisible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.joinScreen}>
          {/* Modal header */}
          <View style={[styles.joinHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={() => setJoinModalVisible(false)}
              style={styles.joinBackBtn}
              hitSlop={HEADER_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Close join project"
            >
              <Ionicons name="arrow-back" size={22} color={Colors.white} />
              <AppText style={styles.joinBackLabel}>My Projects</AppText>
            </TouchableOpacity>
            <AppText style={styles.joinTitle}>
              {joinedRole ? "You're In!" : "Join a Project"}
            </AppText>
          </View>

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
                  <Ionicons name="checkmark" size={36} color={Colors.white} />
                </View>
                <AppText style={styles.joinSuccessTitle}>{"You've joined!"}</AppText>
                <AppText style={styles.joinSuccessHint}>{"You've been added as"}</AppText>
                <View style={styles.joinRoleBadge}>
                  <AppText style={styles.joinRoleBadgeText}>{displayRole(joinedRole)}</AppText>
                </View>
                <TouchableOpacity
                  style={[appStyles.primaryBtn, { alignSelf: "stretch" }]}
                  onPress={() => {
                    setJoinModalVisible(false);
                    fetchProjects();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                >
                  <AppText style={appStyles.primaryBtnText}>Done</AppText>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── Input state ── */
              <>
                <AppText style={appStyles.fieldLabel}>INVITE CODE</AppText>
                <TextInput
                  style={styles.joinCodeInput}
                  value={joinCode}
                  onChangeText={(t) => setJoinCode(t.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={Colors.grey300}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <AppText style={styles.joinHint}>Enter the 6-digit code from your invite.</AppText>

                <AppText style={[appStyles.fieldLabel, { marginTop: 24 }]}>
                  Do you hold a current licence?
                </AppText>
                <View style={appStyles.optionRow}>
                  {(
                    [
                      ["Yes", true],
                      ["No", false],
                      ["N/A", null],
                    ] as const
                  ).map(([label, val]) => (
                    <TouchableOpacity
                      key={label}
                      style={[
                        appStyles.optionChip,
                        joinHasLicence === val && appStyles.optionChipActive,
                      ]}
                      onPress={() => setJoinHasLicence(val)}
                      accessibilityRole="radio"
                      accessibilityLabel={`Licence: ${label}`}
                      accessibilityState={{ checked: joinHasLicence === val }}
                    >
                      <AppText
                        style={[
                          appStyles.optionChipText,
                          joinHasLicence === val && appStyles.optionChipTextActive,
                        ]}
                      >
                        {label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>

                <AppText style={appStyles.fieldLabel}>
                  Do you hold public liability insurance?
                </AppText>
                <View style={appStyles.optionRow}>
                  {(
                    [
                      ["Yes", true],
                      ["No", false],
                      ["N/A", null],
                    ] as const
                  ).map(([label, val]) => (
                    <TouchableOpacity
                      key={label}
                      style={[
                        appStyles.optionChip,
                        joinHasInsurance === val && appStyles.optionChipActive,
                      ]}
                      onPress={() => setJoinHasInsurance(val)}
                      accessibilityRole="radio"
                      accessibilityLabel={`Insurance: ${label}`}
                      accessibilityState={{ checked: joinHasInsurance === val }}
                    >
                      <AppText
                        style={[
                          appStyles.optionChipText,
                          joinHasInsurance === val && appStyles.optionChipTextActive,
                        ]}
                      >
                        {label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>

                {joinError && <AppText style={appStyles.errorText}>{joinError}</AppText>}

                <TouchableOpacity
                  style={[
                    appStyles.primaryBtn,
                    (joinCode.length < 6 || joinLoading) && appStyles.primaryBtnDisabled,
                  ]}
                  onPress={handleJoin}
                  disabled={joinCode.length < 6 || joinLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Join Project"
                  accessibilityState={{ disabled: joinCode.length < 6 || joinLoading }}
                >
                  {joinLoading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <AppText style={appStyles.primaryBtnText}>Join Project</AppText>
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
  headerTaller: {
    paddingBottom: 16,
  },
  topRow: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  menuOverlay: {
    flex: 1,
  },
  menu: {
    position: "absolute",
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 180,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.grey100,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  overdueNum: {
    color: Colors.red,
  },

  // Project cards
  projectCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
  },
  projectInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 4,
  },
  projectName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: 3,
  },
  projectSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  changeBadge: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },

  // Join modal
  joinScreen: {
    flex: 1,
    backgroundColor: Colors.grey100,
  },
  joinHeader: {
    backgroundColor: Colors.vouchGreen,
    paddingBottom: 20,
  },
  joinBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    marginBottom: 8,
  },
  joinBackLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
  joinTitle: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
    paddingHorizontal: 20,
  },
  joinBody: {
    flex: 1,
  },
  joinBodyContent: {
    padding: 24,
    paddingBottom: 48,
  },
  joinCodeInput: {
    height: 72,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    borderRadius: 14,
    paddingHorizontal: 24,
    fontSize: 36,
    fontFamily: Fonts.extraBold,
    letterSpacing: 10,
    marginBottom: 12,
    backgroundColor: Colors.white,
    color: Colors.vouchGreen,
    textAlign: "center",
  },
  joinHint: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    marginBottom: 8,
  },

  // Join success
  joinSuccess: {
    alignItems: "center",
    paddingTop: 48,
    gap: 8,
  },
  joinSuccessIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.vouchGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  joinSuccessTitle: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    color: Colors.black,
  },
  joinSuccessHint: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginBottom: 4,
  },
  joinRoleBadge: {
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 16,
  },
  joinRoleBadgeText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.vouchGreen,
  },
});
