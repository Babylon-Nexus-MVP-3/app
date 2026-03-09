import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
    id: "4",
    name: "Burwood Central",
    subtitle: "12 Units — Burwood NSW",
    role: "Project Manager",
    health: 92,
    overdue: 0,
    change: 8,
  },
];

export default function Projects() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const avgHealth = Math.round(PROJECTS.reduce((sum, p) => sum + p.health, 0) / PROJECTS.length);
  const totalOverdue = PROJECTS.reduce((sum, p) => sum + p.overdue, 0);

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
              style={styles.newProjectBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/(app)/create-project')}
            >
              <Text style={styles.newProjectText}>+ New Project</Text>
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
          <TouchableOpacity key={project.id} style={styles.projectCard} activeOpacity={0.75}>
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
  newProjectBtn: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  newProjectText: {
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
    backgroundColor: "rgba(231,76,60,0.18)",
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
});
