import { Alert, Platform } from "react-native";

/** Alert.alert is a no-op on web — fall back to window.alert there. */
export function showAlert(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(message);
  } else {
    Alert.alert(title, message);
  }
}

/** Message for a failed vouch-request save, keyed off the response status. */
export function vouchRequestErrorMessage(status: number, serverError?: string): string {
  if (status === 400) return serverError ?? "This person has already vouched for you.";
  if (status === 401 || status === 403) {
    return serverError ?? "Verify your mobile number before sending vouch requests.";
  }
  if (status === 429) {
    return "Too many attempts right now. Please wait a few minutes and try again.";
  }
  return serverError ?? "We couldn't send your vouch request. Please try again.";
}

/*
  Confirmation dialog with a web fallback.

  Alert.alert is a no-op on web, so every destructive action was writing its own
  Platform.OS check around a window.confirm. Screens that forgot the check
  silently did nothing on web, or — worse — fired without asking.

  Resolves true when the user confirms.
*/
export function confirmAction({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? "destructive" : "default",
        onPress: () => resolve(true),
      },
    ]);
  });
}
