import { useEffect } from "react";
import { Stack, router } from "expo-router";
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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
