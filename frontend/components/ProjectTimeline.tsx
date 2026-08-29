/*
  The project history timeline — a record over time rather than a list of
  settings, so it reads as a dotted rail with the newest entry at the top.

  Lives here rather than inside the Me tab because two screens draw it: the Me
  tab shows the most recent few inside a card, and the full-history screen shows
  every one. They must stay visually identical, so they share this.
*/
import { View, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { Pill } from "@/components/ui";

export type ProjectHistoryEntry = {
  id: string;
  name: string;
  council?: string;
  location?: string;
  status: string;
  role?: string;
  startedAt: string;
};

/** "2026-03-14T…" → "Mar 2026". Empty string for an unparseable date. */
export function formatStarted(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/** One entry. `isLast` suppresses the connecting line so the rail ends clean. */
export function ProjectTimelineRow({
  project,
  isLast,
}: {
  project: ProjectHistoryEntry;
  isLast: boolean;
}) {
  const meta = [project.role, project.council || project.location, formatStarted(project.startedAt)]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <View style={styles.item}>
      <View style={styles.rail}>
        <View style={[styles.dot, project.status !== "Active" && styles.dotPast]} />
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={[styles.content, isLast && { paddingBottom: 0 }]}>
        <View style={styles.headRow}>
          <AppText style={styles.name} numberOfLines={1}>
            {project.name}
          </AppText>
          {project.status === "Active" && <Pill label="Active" tone="green" />}
        </View>
        <AppText style={styles.meta}>{meta}</AppText>
      </View>
    </View>
  );
}

/** The whole rail. Give it only the slice you want drawn. */
export function ProjectTimeline({
  projects,
  style,
}: {
  projects: ProjectHistoryEntry[];
  style?: object;
}) {
  return (
    <View style={style}>
      {projects.map((p, i) => (
        <ProjectTimelineRow key={p.id} project={p} isLast={i === projects.length - 1} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: "row", gap: 14 },
  rail: { width: 12, alignItems: "center" },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.vouchGreen,
    marginTop: 4,
  },
  dotPast: { backgroundColor: Colors.grey300 },
  line: { flex: 1, width: 2, backgroundColor: Colors.grey100, marginVertical: 4 },
  content: { flex: 1, paddingBottom: 22 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { flex: 1, fontSize: 16, fontFamily: Fonts.bold, color: Colors.black },
  meta: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginTop: 3,
  },
});
