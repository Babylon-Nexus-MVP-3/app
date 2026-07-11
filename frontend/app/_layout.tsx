import { useEffect, useRef, useState } from "react";
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
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });
  const [fontLoadTimedOut, setFontLoadTimedOut] = useState(false);
  const fontsReady = fontsLoaded || !!fontError || fontLoadTimedOut;

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (fontError) console.warn("Font loading failed, continuing without custom fonts", fontError);
  }, [fontError]);

  // Guards against a stalled font asset fetch (e.g. after an OTA update) leaving
  // the app on a permanent blank screen with no error to react to.
  useEffect(() => {
    if (fontsLoaded || fontError) return;
    const timer = setTimeout(() => {
      console.warn("Font loading timed out, continuing without custom fonts");
      setFontLoadTimedOut(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  useEffect(() => {
    Notifications.setBadgeCountAsync(0);
  }, []);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;

      const vouchTypes = ["VouchRequest", "vouch_received"];
      if (data.type && vouchTypes.includes(data.type)) {
        router.push("/(app)/vouch-notifications" as any);
        return;
      }

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

  if (!fontsReady) return null;

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(admin)" options={{ gestureEnabled: false }} />
      </Stack>
    </AuthProvider>
  );
}
