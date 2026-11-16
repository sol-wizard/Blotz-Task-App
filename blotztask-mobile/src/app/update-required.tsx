import { useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { UpdateRequiredScreen } from "@/shared/components/update-required-screen";
import { useLatestUpdateCheck } from "@/shared/hooks/useUpdateCheck";
import { analytics } from "@/shared/services/analytics";
import { SCREEN_NAMES } from "@/shared/constants/posthog-events";

export default function UpdateRequiredRoute() {
  const { storeUrl, forced } = useLocalSearchParams<{ storeUrl: string; forced?: string }>();
  // The splash may open this screen from the policy saved last launch. Once the server has
  // answered, its answer wins: a forced update can arrive while the optional screen is up,
  // and a saved forced policy may have been lifted since.
  const latest = useLatestUpdateCheck();
  const isForced = latest ? latest.kind === "forcedUpdate" : forced === "true";
  const latestStoreUrl = latest && latest.kind !== "upToDate" ? latest.storeUrl : undefined;

  useEffect(() => {
    analytics.trackScreenViewed(SCREEN_NAMES.UPDATE_REQUIRED);
  }, []);

  return <UpdateRequiredScreen storeUrl={latestStoreUrl ?? storeUrl ?? ""} forced={isForced} />;
}
