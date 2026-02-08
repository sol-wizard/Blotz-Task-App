import { PostHog } from "posthog-react-native";

const posthog = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_API_KEY!, {
  host: "https://us.i.posthog.com",
  enableSessionReplay: true,
});

void posthog.register({
  env: process.env.EXPO_PUBLIC_APP_ENV ?? "unknown",
});

export default posthog;
