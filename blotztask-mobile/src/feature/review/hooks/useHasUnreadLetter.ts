import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { format, isAfter, startOfMonth } from "date-fns";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { ReviewPeriodType } from "../models/review-dto";
import {
  getLatestReviewableMonth,
  getLatestReviewableWeek,
  startOfReviewWeek,
} from "../utils/week-utils";
import { useReadLettersStore } from "./useReadLettersStore";

// True while last week's or last month's letter hasn't been read on this phone. Only the latest
// letter of each kind counts; a new week or month replaces the one before.
export function useHasUnreadLetter() {
  const { userProfile } = useUserProfile();
  const read = useReadLettersStore((state) => state.read);
  const load = useReadLettersStore((state) => state.load);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    void load();
  }, [load]);

  // A new week or month can start while the app sits in the background.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => subscription.remove();
  }, []);

  if (read === null || !userProfile?.signUpAt) return false;

  const signUpAt = new Date(userProfile.signUpAt);
  const latestWeek = getLatestReviewableWeek(now);
  const latestMonth = getLatestReviewableMonth(now);

  // A brand-new user has no finished week or month yet, so there is no letter to read.
  const isWeekUnread =
    !isAfter(startOfReviewWeek(signUpAt), latestWeek) &&
    read[ReviewPeriodType.Weekly] !== format(latestWeek, "yyyy-MM-dd");
  const isMonthUnread =
    !isAfter(startOfMonth(signUpAt), latestMonth) &&
    read[ReviewPeriodType.Monthly] !== format(latestMonth, "yyyy-MM-dd");

  return isWeekUnread || isMonthUnread;
}
