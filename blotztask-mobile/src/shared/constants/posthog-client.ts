import { PostHog } from "posthog-react-native";
import * as Application from "expo-application";
import { Platform } from "react-native";

const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? "unknown";
const isTrackingEnabled = appEnv === "production";

const posthog = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_API_KEY!, {
  host: "https://us.i.posthog.com",
  enableSessionReplay: isTrackingEnabled,
  disabled: !isTrackingEnabled,
});

if (isTrackingEnabled) {
  const superProperties: Record<string, string> = {
    env: appEnv,
    platform: Platform.OS,
    os_version: String(Platform.Version),
  };

  if (Application.nativeApplicationVersion) {
    superProperties.app_version = Application.nativeApplicationVersion;
  }

  void posthog.register(superProperties);
}

export default posthog;
