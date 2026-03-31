import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { EVENTS } from "@/shared/constants/posthog-events";
import { analytics } from "@/shared/services/analytics";

const STORAGE_PREFIX = EVENTS.ACTIVE_USER_5S;

async function alreadyActiveToday() {
  const key = `${STORAGE_PREFIX}_${format(new Date(), "yyyy-MM-dd")}`;
  return Boolean(await AsyncStorage.getItem(key));
}

async function markActiveToday() {
  const key = `${STORAGE_PREFIX}_${format(new Date(), "yyyy-MM-dd")}`;
  await AsyncStorage.setItem(key, "1");
}

export function useTrackActiveUser5s() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimer = async () => {
    if (await alreadyActiveToday()) return;

    timerRef.current = setTimeout(async () => {
      if (AppState.currentState !== "active") return;

      analytics.trackDailyActiveUser(format(new Date(), "yyyy-MM-dd"));
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
