import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { cancelReviewReminders, scheduleReviewReminders } from "../utils/review-reminders";

// Keeps the phone's letter reminders in step with the Review Reminders switch. `t` changes with the
// language, so the reminders are set again in the new language.
export function useReviewReminderSync() {
  const { t } = useTranslation("settings");
  const { userPreferences } = useUserPreferencesQuery();
  const isLoaded = userPreferences !== undefined;
  // Missing means on, the same as the switch shows.
  const reviewNotification = userPreferences?.reviewNotification ?? true;

  useEffect(() => {
    if (!isLoaded) return;
    if (reviewNotification) void scheduleReviewReminders(t);
    else void cancelReviewReminders();
  }, [isLoaded, reviewNotification, t]);

  // This layout unmounts on every sign-out, including an expired session, and a signed-out
  // phone should stop reminding about letters it can no longer open.
  useEffect(() => {
    return () => void cancelReviewReminders();
  }, []);
}
