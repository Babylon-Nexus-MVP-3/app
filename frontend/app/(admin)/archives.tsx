import { API_BASE_URL } from "@/constants/api";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { useAuth } from "@/context/AuthContext";
import { AppText } from "@/components/AppText";

type ArchivedProject = {
  _id: string;
  name: string;
  location: string;
  council: string;
  status: "Inactive";
  createdAt: string;
};

export default function AdminArchives() {
  const { fetchWithAuth, isLoading: authLoading } = useAuth();

  const [projects, setProjects] = useState<ArchivedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchProjects(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/admin/projects/inactive`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load archived projects.");
        return;
      }
      setProjects(data.projects ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchProjects(true);
    setRefreshing(false);
  }

  useEffect(() => {
    if (!authLoading) fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) fetchProjects();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading])
  );

  const total = projects.length;

  return (
    <View style={styles.screen}>
      <View style={{ backgroundColor: Colors.vouchGreen }}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerInner}>
            <View>
              <AppText style={styles.adminBadge}>ADMIN CONSOLE</AppText>
              <AppText style={styles.headerTitle}>Archives</AppText>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <AppText style={styles.statNum}>{total}</AppText>
              <AppText style={styles.statLabel}>Inactive Projects</AppText>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.vouchGreen}
            colors={[Colors.vouchGreen]}
          />
        }
      >
        <AppText style={styles.sectionLabel}>ARCHIVED PROJECTS</AppText>

        {loading ? (
          <ActivityIndicator color={Colors.vouchGreen} style={{ marginTop: 32 }} />
        ) : error ? (
          <View style={styles.centerBox}>
            <AppText style={styles.errorText}>{error}</AppText>
            <TouchableOpacity
              onPress={() => fetchProjects()}
              style={styles.retryBtn}
              accessibilityRole="button"
              accessibilityLabel="Retry loading archived projects"
            >
              <AppText style={styles.retryBtnText}>Retry</AppText>
            </TouchableOpacity>
          </View>
        ) : projects.length === 0 ? (
          <AppText style={styles.emptyText}>No archived projects.</AppText>
        ) : (
          projects.map((project) => (
            <TouchableOpacity
              key={project._id}
              style={styles.projectCard}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/(admin)/project/[id]",
                  params: { id: project._id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`View archived project ${project.name}`}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardTitleBlock}>
                  <AppText style={styles.projectName}>{project.name}</AppText>
                  <AppText style={styles.projectAddress}>{project.location}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.grey300} />
              </View>
              <AppText style={styles.projectDate}>
                Submitted {new Date(project.createdAt).toLocaleDateString("en-AU")}
              </AppText>
            </TouchableOpacity>
          ))
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
  statsRow: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 20, gap: 8 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: Colors.whiteGloss,
    alignItems: "center",
  },
  statNum: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.white },
  statLabel: {
    fontSize: 10,
    color: Colors.white,
    fontFamily: Fonts.semiBold,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
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
    marginBottom: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitleBlock: { flex: 1, marginRight: 12 },
  projectName: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.black, marginBottom: 2 },
  projectAddress: { fontSize: 13, color: Colors.grey500, fontFamily: Fonts.regular },
  projectDate: { fontSize: 12, color: Colors.grey500, fontFamily: Fonts.regular },
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
  emptyText: {
    fontSize: 14,
    color: Colors.grey500,
    fontFamily: Fonts.regular,
    textAlign: "center",
    marginTop: 32,
  },
});
