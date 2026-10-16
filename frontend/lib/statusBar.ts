import { useEffect } from "react";
import { usePathname } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";

/*
  Screens whose top edge is white. Everything else opens on brand green (the
  welcome gradient, the tabs, ScreenHeader, the project headers), which needs
  light status-bar text.

  Left to the system, the status bar followed the phone's appearance instead of
  the screen: dark clock on the green headers in light mode, and white clock on
  the white sign-in screens in dark mode — invisible.

  Paths are expo-router pathnames, so route groups like (auth) are not in them.
*/
const WHITE_TOP_ROUTES = new Set([
  "/sign-in",
  "/sign-up",
  "/verify-email",
  "/forgot-password",
  "/verify-reset-code",
  "/reset-password",
  "/create-project",
  "/change-password",
  "/change-business-name",
  "/add-abn",
  "/verify-mobile",
  "/change-email",
  "/email-status",
  "/mobile-status",
  "/join-project",
  "/project-locked",
]);

/** Keeps the status bar readable against whichever screen is showing. */
export function useRouteStatusBar() {
  const pathname = usePathname();
  useEffect(() => {
    setStatusBarStyle(WHITE_TOP_ROUTES.has(pathname) ? "dark" : "light", true);
  }, [pathname]);
}
