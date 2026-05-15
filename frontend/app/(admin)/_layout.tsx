import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { useAuth } from "@/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AdminLayout() {
  const { user, isLoading } = useAuth();
  const { bottom } = useSafeAreaInsets();

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
          backgroundColor: Colors.vouchGreen,
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: bottom,
          height: 60 + bottom,
        },
        tabBarActiveTintColor: Colors.white,
        tabBarInactiveTintColor: "rgba(255,255,255,0.45)",
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: Fonts.semiBold,
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
