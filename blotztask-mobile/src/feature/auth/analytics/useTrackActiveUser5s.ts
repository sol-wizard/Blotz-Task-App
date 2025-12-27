import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { EVENTS } from "@/shared/constants/posthog-events";
import PostHog from "posthog-react-native";

async function alreadyActiveToday() {
  const key = `${EVENTS.ACTIVE_USER_5S}_${format(new Date(), "yyyy-MM-dd")}`;
  const v = await AsyncStorage.getItem(key);
  return Boolean(v);
}

async function markActiveToday() {
  const key = `${EVENTS.ACTIVE_USER_5S}_${format(new Date(), "yyyy-MM-dd")}`;
  await AsyncStorage.setItem(key, "1");
}

export function useTrackActiveUser5s(posthog: PostHog) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimer = async () => {
    if (await alreadyActiveToday()) return;

    timerRef.current = setTimeout(async () => {
      if (AppState.currentState !== "active") return;
      posthog.capture(EVENTS.ACTIVE_USER_5S, {
        seconds: 5,
        day: format(new Date(), "yyyy-MM-dd"),
        source: "foreground",
      });

      await markActiveToday();
    }, 5000);
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (AppState.currentState === "active") {
      startTimer();
    }

    const handleAppStateChange = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        startTimer();
      } else {
        clearTimer();
      }
    });

    return () => {
      clearTimer();
      handleAppStateChange.remove();
    };
  }, []);
}
