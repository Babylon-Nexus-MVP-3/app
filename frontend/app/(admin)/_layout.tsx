import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/");
    } else if (user.role !== "Admin") {
      router.replace("/(app)/projects");
    }
  }, [user, isLoading]);

  if (isLoading || !user || user.role !== "Admin") return null;

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
          title: "All Projects",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: "Approvals",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "checkmark-circle" : "checkmark-circle-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="archives"
        options={{
          title: "Archives",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "archive" : "archive-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="project/[id]" options={{ href: null }} />
      <Tabs.Screen name="approval/[id]" options={{ href: null }} />
    </Tabs>
  );
}
