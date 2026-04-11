import { useEffect, useRef } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { API_BASE_URL } from "@/constants/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

function handleNotificationTap(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as {
    type?: string;
    projectId?: string;
    invoiceId?: string;
  };

  if (!data.projectId) return;

  const nonNavigableTypes = [
    "ProjectPendingApproval",
    "ProjectRejected",
    "ProjectDeleted",
    "ProjectParticipantRemoved",
  ];

  if (data.type && nonNavigableTypes.includes(data.type)) return;

  if (data.invoiceId) {
    router.push(`/(app)/project/${data.projectId}?openInvoice=${data.invoiceId}`);
  } else {
    router.push(`/(app)/project/${data.projectId}`);
  }
}

export function usePushNotifications(
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>
) {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then(async (token) => {
      if (!token) return;
      try {
        await fetchWithAuth(`${API_BASE_URL}/notifications/push-token`, {
          method: "PATCH",
          body: JSON.stringify({ token }),
        });
      } catch {
        // Non-fatal — push token registration failure doesn't affect core app
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Foreground notifications are shown automatically via setNotificationHandler above
    });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(handleNotificationTap);

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
