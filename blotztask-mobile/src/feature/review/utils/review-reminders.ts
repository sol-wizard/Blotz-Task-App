import * as Notifications from "expo-notifications";
import { TFunction } from "i18next";
import { ReviewPeriodType } from "../models/review-dto";

// Fixed ids, so setting the reminders again replaces these two instead of adding more.
const REMINDER_IDS = {
  [ReviewPeriodType.Weekly]: "review-weekly",
  [ReviewPeriodType.Monthly]: "review-monthly",
} as const;

// Created in registerForPushNotificationsAsync; without it Android uses a default-importance one.
const ANDROID_CHANNEL_ID = "blotzNotificationChannel";

// One call at a time: a quick toggle or language change must not leave a mix of old and new.
let queue: Promise<void> = Promise.resolve();
const enqueue = (work: () => Promise<void>) => {
  queue = queue.then(work).catch((error) => console.log("Review reminders not updated:", error));
  return queue;
};

const cancelBoth = async () => {
  await Promise.all(
    Object.values(REMINDER_IDS).map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );
};

export const cancelReviewReminders = () => enqueue(cancelBoth);

// Monday 09:00 for last week's letter and the 1st at 09:00 for last month's, in the phone's time.
// Both periods have ended by then, so the letter can always be written. The text is fixed when
// scheduled, so call this again after the language changes.
export const scheduleReviewReminders = (t: TFunction<"settings">) =>
  enqueue(async () => {
    await cancelBoth();
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_IDS[ReviewPeriodType.Weekly],
      content: {
        title: t("reviewReminder.weeklyTitle"),
        body: t("reviewReminder.weeklyBody"),
        data: { type: "review", period: ReviewPeriodType.Weekly },
      },
      // weekday 1 is Sunday.
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        channelId: ANDROID_CHANNEL_ID,
        weekday: 2,
        hour: 9,
        minute: 0,
      },
    });
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_IDS[ReviewPeriodType.Monthly],
      content: {
        title: t("reviewReminder.monthlyTitle"),
        body: t("reviewReminder.monthlyBody"),
        data: { type: "review", period: ReviewPeriodType.Monthly },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        channelId: ANDROID_CHANNEL_ID,
        day: 1,
        hour: 9,
        minute: 0,
      },
    });
  });
