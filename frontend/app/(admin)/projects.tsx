import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

type AdminProject = {
  _id: string;
  name: string;
  location: string;
  council: string;
  status: "Pending" | "Active" | "Rejected";
  createdAt: string;
};

export default function AdminProjects() {
  const { fetchWithAuth, isLoading: authLoading, logout } = useAuth();

  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchProjects() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("http://localhost:3229/admin/projects/active");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load projects.");
        return;
      }
      setProjects(data.projects ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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

  function handleSignOutPress() {
    Alert.alert("Sign out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void logout();
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.header}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.adminBadge}>ADMIN CONSOLE</Text>
              <Text style={styles.headerTitle}>All Projects</Text>
            </View>
            <TouchableOpacity onPress={handleSignOutPress} style={styles.signOutBtn} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={22} color={Colors.gold} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: Colors.green }]}>{total}</Text>
              <Text style={styles.statLabel}>Active Projects</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>ALL PROJECTS</Text>

        {loading ? (
          <ActivityIndicator color={Colors.gold} style={{ marginTop: 32 }} />
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchProjects} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : projects.length === 0 ? (
          <Text style={styles.emptyText}>No projects found.</Text>
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
            >
              <View style={styles.cardTop}>
                <View style={styles.cardTitleBlock}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <Text style={styles.projectAddress}>{project.location}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </View>
              <Text style={styles.projectDate}>
                Submitted {new Date(project.createdAt).toLocaleDateString("en-AU")}
              </Text>
            </TouchableOpacity>
          ))
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
    paddingBottom: 20,
  },
  signOutBtn: {
    padding: 4,
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
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
  },
  statNum: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.white,
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
    marginBottom: 10,
    shadowColor: "#000",
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
  cardTitleBlock: {
    flex: 1,
    marginRight: 12,
  },
  projectName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  projectAddress: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  projectDate: {
    fontSize: 12,
    color: Colors.textSecondary,
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
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 32,
  },
});
