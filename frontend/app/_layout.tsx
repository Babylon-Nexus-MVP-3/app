import { useEffect, useRef } from "react";
import { Stack, router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from "@expo-google-fonts/dm-sans";
import { AuthProvider } from "@/context/AuthContext";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    Notifications.setBadgeCountAsync(0);
  }, []);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      if (!data?.projectId) {
        router.push("/(app)/notifications" as any);
        return;
      }
      const nonNavigableTypes = [
        "ProjectPendingApproval",
        "ProjectRejected",
        "ProjectDeleted",
        "ProjectParticipantRemoved",
      ];
      if (data.type && nonNavigableTypes.includes(data.type)) {
        router.push("/(app)/notifications" as any);
        return;
      }
      if (data.invoiceId) {
        router.push(`/(app)/project/${data.projectId}?openInvoice=${data.invoiceId}` as any);
      } else {
        router.push(`/(app)/project/${data.projectId}` as any);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </AuthProvider>
  );
}
