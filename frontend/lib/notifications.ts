import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { API_BASE_URL } from "@/constants/api";

const EAS_PROJECT_ID = "9d4647b6-8dc0-4bd4-82fb-256190ef2cd8";

export async function registerForPushNotifications(
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>
): Promise<void> {
  // Push notifications require a physical device
  if (!Device.isDevice) return;

  // Android requires an explicit notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Babylon Nexus",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#C9A84C",
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });

  await fetchWithAuth(`${API_BASE_URL}/auth/push-token`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pushToken: tokenData.data }),
  });
}
