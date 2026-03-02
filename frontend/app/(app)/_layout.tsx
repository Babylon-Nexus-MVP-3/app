import { Stack } from "expo-router";

// TODO: Replace with tab navigator once Projects, Notifications, Settings screens are built
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
