/*
  Every project the user has ever been on. The Me tab shows only the most recent
  few inside a card — this is where the full record lives, because the list grows
  without bound and would otherwise bury the rest of the profile.

  It refetches rather than receiving the list through params: route params are
  strings, and the Me tab's copy may be stale by the time you arrive here.
*/
import { useCallback, useState } from "react";
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { ScreenHeader, sheetStyle } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/ui";
import { AppText } from "@/components/AppText";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { API_BASE_URL } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import { ProjectTimelineRow, type ProjectHistoryEntry } from "@/components/ProjectTimeline";

export default function ProjectHistoryScreen() {
  const { fetchWithAuth } = useAuth();
  const [projects, setProjects] = useState<ProjectHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/projects/history`);
      if (!res.ok) {
        setFailed(true);
        return;
      }
      const data = await res.json();
      setProjects(data.projects ?? []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
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

  const activeCount = projects.filter((p) => p.status === "Active").length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Project history"
        showBack
        subtitle={
          projects.length === 0
            ? undefined
            : `${projects.length} ${projects.length === 1 ? "project" : "projects"}${
                activeCount > 0 ? ` · ${activeCount} active` : ""
              }`
        }
      />

      {loading ? (
        <View style={[sheetStyle.sheet, styles.centre]}>
          <ActivityIndicator color={Colors.vouchGreen} />
        </View>
      ) : (
        <FlatList
          style={sheetStyle.sheet}
          contentContainerStyle={projects.length === 0 ? styles.emptyContent : sheetStyle.content}
          data={projects}
          keyExtractor={(p) => p.id}
          renderItem={({ item, index }) => (
            <ProjectTimelineRow project={item} isLast={index === projects.length - 1} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.vouchGreen}
            />
          }
          ListEmptyComponent={
            failed ? (
              <EmptyState
                icon="cloud-offline-outline"
                title="Couldn't load your history"
                subtitle="Check your connection and pull down to try again."
              />
            ) : (
              <EmptyState
                icon="briefcase-outline"
                title="No projects yet"
                subtitle="Projects you join will appear here as you work."
              />
            )
          }
          ListFooterComponent={
            projects.length > 0 ? (
              <AppText style={styles.footnote}>
                Newest first · joined projects appear once your role is accepted
              </AppText>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.vouchGreen },
  centre: { alignItems: "center", justifyContent: "center" },
  emptyContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 16 },
  footnote: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    marginTop: 18,
  },
});
