import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const { bottom } = useSafeAreaInsets();

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
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.grey300,
          paddingTop: 8,
          paddingBottom: bottom,
          height: 60 + bottom,
        },
        tabBarActiveTintColor: Colors.vouchGreen,
        tabBarInactiveTintColor: Colors.grey500,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vouches"
        options={{
          title: "Vouches",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "shield-checkmark" : "shield-checkmark-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Project",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "sync-circle" : "sync-circle-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* Hidden screens — not in tab bar */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="change-password" options={{ href: null }} />
      <Tabs.Screen name="create-project" options={{ href: null }} />
      <Tabs.Screen name="project/[id]" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="project/audit-log/[projectId]" options={{ href: null }} />
      <Tabs.Screen name="get-vouched" options={{ href: null, tabBarStyle: { display: "none" } }} />
    </Tabs>
  );
}
