import Expo from "expo-server-sdk";

/*
  The one Expo push client, and the one way to send a push.

  Every push in the app is best-effort: the in-app notification row is the
  record, and a push that can't be delivered must never fail the request that
  triggered it. The same "check the token, send, swallow the error" block used
  to be written out at each call site, with its own client.
*/

const expo = new Expo();

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/*
  Sends one push to one device. Skips a missing or non-Expo token and never
  rejects. Callers that shouldn't wait on Expo don't await it.
*/
export async function sendPush(
  token: string | null | undefined,
  message: PushMessage
): Promise<void> {
  if (!token || !Expo.isExpoPushToken(token)) return;
  try {
    await expo.sendPushNotificationsAsync([{ to: token, ...message }]);
  } catch {
    // Push failure is non-fatal
  }
}
