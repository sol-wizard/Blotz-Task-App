import { PostHog } from "posthog-react-native";

const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? "unknown";
const isTrackingEnabled = appEnv === "production";

const posthog = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_API_KEY!, {
  host: "https://us.i.posthog.com",
  enableSessionReplay: isTrackingEnabled,
  disabled: !isTrackingEnabled,
});

if (isTrackingEnabled) {
  void posthog.register({
    env: appEnv,
  });
}

export default posthog;
