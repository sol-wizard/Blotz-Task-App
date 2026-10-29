import { useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { UpdateRequiredScreen } from "@/shared/components/update-required-screen";
import { analytics } from "@/shared/services/analytics";
import { SCREEN_NAMES } from "@/shared/constants/posthog-events";

export default function UpdateRequiredRoute() {
  const { storeUrl, forced } = useLocalSearchParams<{ storeUrl: string; forced?: string }>();

  useEffect(() => {
    analytics.trackScreenViewed(SCREEN_NAMES.UPDATE_REQUIRED);
  }, []);

  return <UpdateRequiredScreen storeUrl={storeUrl ?? ""} forced={forced === "true"} />;
}
