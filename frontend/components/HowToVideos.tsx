/*
  The "How to use VouchPay" section: three short walkthrough videos.

  Videos open in the in-app browser rather than an external app so the user
  keeps their place in VouchPay and can swipe straight back.

  A video with no link yet is shown greyed out and marked "Coming soon" rather
  than hidden. Hiding it would make the section silently change shape as videos
  land; this way people can see what's on the way, and no row is a dead tap.
*/
import { useState } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { SectionLabel } from "@/components/ui";
import { showAlert } from "@/lib/errors";
import { HOW_TO_VIDEOS, type HowToVideo } from "@/constants/videos";

function VideoRow({ video, isLast }: { video: HowToVideo; isLast: boolean }) {
  const [opening, setOpening] = useState(false);
  const available = video.url.trim() !== "";

  async function open() {
    if (!available || opening) return;
    setOpening(true);
    try {
      await WebBrowser.openBrowserAsync(video.url, {
        controlsColor: Colors.vouchGreen,
        toolbarColor: Colors.white,
      });
    } catch {
      showAlert("Couldn't open the video", "Check your connection and try again.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <>
      <TouchableOpacity
        style={styles.row}
        onPress={open}
        disabled={!available || opening}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={
          available ? `Watch: ${video.title}. ${video.description}` : `${video.title}. Coming soon`
        }
        accessibilityState={{ disabled: !available }}
      >
        <View style={[styles.icon, !available && styles.iconMuted]}>
          <Ionicons
            name={video.icon}
            size={18}
            color={available ? Colors.vouchGreen : Colors.grey500}
          />
        </View>

        <View style={styles.body}>
          <AppText style={[styles.title, !available && styles.titleMuted]}>{video.title}</AppText>
          <AppText style={styles.description}>{video.description}</AppText>
        </View>

        {opening ? (
          <ActivityIndicator size="small" color={Colors.vouchGreen} />
        ) : available ? (
          <View style={styles.playBadge}>
            <Ionicons name="play" size={13} color={Colors.white} />
          </View>
        ) : (
          <AppText style={styles.soon}>Coming soon</AppText>
        )}
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

export function HowToVideos() {
  return (
    <>
      <SectionLabel>How to use VouchPay</SectionLabel>
      <View style={styles.card}>
        {HOW_TO_VIDEOS.map((video, i) => (
          <VideoRow key={video.id} video={video} isLast={i === HOW_TO_VIDEOS.length - 1} />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.grey300,
    overflow: "hidden",
    marginBottom: 26,
  },
  divider: { height: 1, backgroundColor: Colors.grey300, marginHorizontal: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.vouchGreenLight,
  },
  iconMuted: { backgroundColor: Colors.grey100 },
  body: { flex: 1 },
  title: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.black },
  titleMuted: { color: Colors.grey700 },
  description: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.grey500, marginTop: 2 },
  playBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.vouchGreen,
    alignItems: "center",
    // The glyph's own whitespace sits left of centre, so nudge it back.
    justifyContent: "center",
    paddingLeft: 2,
  },
  soon: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.grey500 },
});
