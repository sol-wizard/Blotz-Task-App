const bundleIdentifier = process.env.BUNDLE_IDENTIFIER ?? "com.Blotz.BlotzTask";
const androidWidgetConfig = {
  widgets: [
    {
      name: "TodayTasksWidget",
      label: "Today",
      description: "Shows today's BlotzTask tasks",
      minWidth: "250dp",
      minHeight: "110dp",
      targetCellWidth: 4,
      targetCellHeight: 2,
      resizeMode: "horizontal|vertical",
      updatePeriodMillis: 1800000,
    },
  ],
};

export default {
  expo: {
    name: "BlotzTask",
    icon: "./assets/images-png/blotz-icon.png",
    slug: "BlotzTask",
    owner: "blotz",
    version: process.env.APP_VERSION ?? "1.0.0",
    runtimeVersion: process.env.APP_VERSION ?? "1.0.0",
    orientation: "portrait",
    scheme: "blotztask",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: false,
      bundleIdentifier,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleDevelopmentRegion: "en",
        CFBundleLocalizations: ["en", "zh-Hans"],
        NSPhotoLibraryUsageDescription:
          "Allow access to your photo library so you can attach images to tasks and notes (e.g., a screenshot or receipt).",
        NSPhotoLibraryAddUsageDescription:
          "Allow saving images to your photo library when you export or download images from BlotzTask (e.g., a shared task card).",
        NSCameraUsageDescription:
          "Allow camera access so you can take a photo and attach it to a task or note (e.g., a document, whiteboard, or receipt).",
        NSSpeechRecognitionUsageDescription:
          "BlotzTask uses speech recognition to turn your voice into text for creating tasks and notes.",
        NSMicrophoneUsageDescription:
          "BlotzTask uses the microphone for voice input so you can dictate tasks and notes. Audio is used only for speech-to-text and is not stored.",
        NSMotionUsageDescription:
          "BlotzTask uses motion data for an optional shake interaction in the app (e.g., to animate capsule-toy style effects). Motion data is not stored.",
        NSLocationWhenInUseUsageDescription:
          "BlotzTask uses your location to provide location-aware features when you choose to use them. Your location is not stored.",
      },
      appleTeamId: "LXC29JARY5",
      icon: "./assets/images-png/blotz-icon.png",
    },
    android: {
      package: "com.blotz.blotztask",
      permissions: ["android.permission.RECORD_AUDIO", "android.permission.ACCESS_FINE_LOCATION"],
    },
    web: {
      bundler: "metro",
      output: "static",
    },
    plugins: [
      "expo-router",
      [
        "expo-dev-client",
        {
          launchMode: "most-recent",
        },
      ],
      [
        "react-native-auth0",
        {
          domain: "dev-k72xachs0fr6nebp.us.auth0.com",
        },
      ],
      "expo-font",
      "expo-localization",
      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
          project: "blotz-app",
          organization: "blotz",
        },
      ],
      ["expo-audio", { enableBackgroundPlayback: false }],
      [
        "expo-calendar",
        {
          calendarPermission:
            "BlotzTask needs calendar access to sync your tasks into Apple Calendar.",
        },
      ],
      "expo-asset",
      "expo-build-properties",
      "@react-native-vector-icons/ionicons",
      "@react-native-vector-icons/feather",
      "@react-native-vector-icons/material-design-icons",
      "@react-native-vector-icons/material-icons",
      "expo-image",
      "expo-sharing",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#ffffff",
          image: "./assets/images-png/blotz-icon.png",
          imageWidth: 200,
        },
      ],
      "expo-status-bar",
      [
        "expo-widgets",
        {
          bundleIdentifier: `${bundleIdentifier}.ExpoWidgetsTarget`,
          groupIdentifier: `group.${bundleIdentifier}`,
          widgets: [
            {
              name: "TodayTasksWidget",
              displayName: "Today's Tasks",
              description: "Shows a lightweight summary of today's BlotzTask tasks.",
              supportedFamilies: ["systemSmall", "systemMedium", "systemLarge"],
            },
          ],
        },
      ],
      ["react-native-android-widget", androidWidgetConfig],
      "./plugins/withAndroidWorkManagerFix",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "8e8ffbf2-206b-4d9b-b11c-a387b49a3126",
      },
    },
    updates: {
      enabled: false,
    },
  },
};
