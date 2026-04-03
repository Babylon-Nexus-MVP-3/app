import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

function NotificationIcon({ color, focused }: { color: string; focused: boolean }) {
  const { fetchWithAuth } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetchWithAuth("https://app-production-574c.up.railway.app/notifications");
      if (res.ok) {
        const data = await res.json();
        const count = (data.notifications ?? []).filter((n: { read: boolean }) => !n.read).length;
        setUnreadCount(count);
      }
    } catch {
      // silently ignore
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  return (
    <View>
      <Ionicons name={focused ? "flash" : "flash-outline"} size={24} color={color} />
      {unreadCount > 0 && <View style={styles.badge} />}
    </View>
  );
}

export default function AppLayout() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/");
    } else if (user.role === "Admin") {
      router.replace("/(admin)/projects");
    }
  }, [user, isLoading]);

  if (isLoading || !user || user.role === "Admin") return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.navy,
          borderTopWidth: 0,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, focused }) => <NotificationIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="change-password"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen name="create-project" options={{ href: null }} />
      <Tabs.Screen name="project/[id]" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="project/audit-log/[projectId]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 0,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.red,
    borderWidth: 1.5,
    borderColor: Colors.navy,
  },
});
