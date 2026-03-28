import { PostHog } from "posthog-react-native";

const isProduction = process.env.EXPO_PUBLIC_APP_ENV === "production";

const posthog = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_API_KEY!, {
  host: "https://us.i.posthog.com",
  enableSessionReplay: isProduction,
  disabled: !isProduction,
});

if (isProduction) {
  void posthog.register({
    env: "production",
  });
}

export default posthog;
