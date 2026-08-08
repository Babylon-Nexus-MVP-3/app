import { Ionicons } from "@expo/vector-icons";
import { Icon, Label, NativeTabs, VectorIcon } from "expo-router/unstable-native-tabs";
import { Colors } from "@/constants/colors";

/**
 * Native tab bar — a real UITabBarController on iOS and a Material 3
 * BottomNavigationView on Android, rather than a JS-drawn bar. That buys the
 * platform behaviour for free: iOS 26 Liquid Glass, scroll-edge transparency,
 * correct safe-area handling, and system accessibility.
 *
 * Icons: SF Symbols on iOS, and Ionicons rendered through `VectorIcon` on
 * Android so we don't have to ship drawable resources into the native project.
 */
export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={Colors.vouchGreen}
      iconColor={{ default: Colors.grey500, selected: Colors.vouchGreen }}
      labelStyle={{ color: Colors.grey500 }}
      backgroundColor={Colors.white}
    >
      <NativeTabs.Trigger name="home">
        <Label>Home</Label>
        <Icon
          sf={{ default: "house", selected: "house.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="home-outline" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="vouches">
        <Label>Vouches</Label>
        <Icon
          sf={{ default: "checkmark.shield", selected: "checkmark.shield.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="shield-checkmark-outline" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="projects">
        <Label>Projects</Label>
        <Icon
          sf={{ default: "briefcase", selected: "briefcase.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="briefcase-outline" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="me">
        <Label>Me</Label>
        <Icon
          sf={{ default: "person", selected: "person.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="person-outline" />}
        />
      </NativeTabs.Trigger>

      {/* Reached from the home screen's "Create a project" row, not the bar. */}
      <NativeTabs.Trigger name="vouch-my-project" hidden />
    </NativeTabs>
  );
}
