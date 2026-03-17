import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "flash" : "flash-outline"} size={24} color={color} />
          ),
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
      <Tabs.Screen name="create-project" options={{ href: null }} />
      <Tabs.Screen name="project/[id]" options={{ href: null }} />
    </Tabs>
  );
}
