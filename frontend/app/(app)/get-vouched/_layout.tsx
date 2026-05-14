import { Stack } from "expo-router";
import { WizardProvider } from "./WizardContext";

export default function GetVouchedLayout() {
  return (
    <WizardProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </WizardProvider>
  );
}
