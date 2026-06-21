module.exports = {
  expo: {
    name: "VouchPay",
    slug: "babylonnexus",
    version: "2.3.0",
    orientation: "portrait",
    icon: "./assets/appIcon.png",
    scheme: "frontend",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.babylonnexus",
      buildNumber: "7",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "com.babylonnexus",
      versionCode: 7,
      softwareKeyboardLayoutMode: "pan",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      adaptiveIcon: {
        backgroundColor: "#0D3D2B",
        foregroundImage: "./assets/appIcon.png",
        monochromeImage: "./assets/appIconMono.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "static",
      favicon: "./assets/appIcon.png",
    },
    updates: {
      url: "https://u.expo.dev/9d4647b6-8dc0-4bd4-82fb-256190ef2cd8",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    plugins: [
      "expo-router",
      "expo-updates",
      [
        "expo-notifications",
        {
          icon: "./assets/babylon_notification.png",
          color: "#1A1A2E",
          defaultChannel: "default",
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/appIcon.png",
          imageWidth: 300,
          resizeMode: "contain",
          backgroundColor: "#0D3D2B",
          dark: {
            backgroundColor: "#0D3D2B",
          },
        },
      ],
      "expo-secure-store",
      "@react-native-community/datetimepicker",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "9d4647b6-8dc0-4bd4-82fb-256190ef2cd8",
      },
    },
    owner: "babylon_nexus",
  },
};
