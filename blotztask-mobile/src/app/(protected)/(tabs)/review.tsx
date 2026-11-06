import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { format } from "date-fns";
import { analytics } from "@/shared/services/analytics";
import { SCREEN_NAMES } from "@/shared/constants/posthog-events";
import ReviewScreen from "@/feature/review/screens/review-screen";

const today = () => format(new Date(), "yyyy-MM-dd");

export default function ReviewTab() {
  // A tab stays mounted, so the page would keep showing the week it first opened on.
  // Re-mounting it on a new day makes it start from the latest week and month again.
  const [day, setDay] = useState(today);

  useFocusEffect(
    useCallback(() => {
      setDay(today());
      // Tracked here, once per visit; a mount-time event would fire only once per app start.
      // Name kept from when the page lived in settings, so existing dashboards still match.
      analytics.trackScreenViewed(SCREEN_NAMES.SETTINGS_REVIEW);
    }, []),
  );

  return <ReviewScreen key={day} />;
}
