import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { Href, router } from "expo-router";
import { ReviewPeriodType } from "../models/review-dto";

// A tap that starts the app can reach both the sign-in gate and the listener; open it once.
const handledTaps = new Set<string>();

// Where a letter reminder tap should open the Review tab, or null for any other notification.
function getReviewLetterHref(response: Notifications.NotificationResponse): Href | null {
  const { request, date } = response.notification;
  const data = request.content.data;
  if (
    data?.type !== "review" ||
    response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
  ) {
    return null;
  }

  const tapId = `${request.identifier}@${date}`;
  if (handledTaps.has(tapId)) return null;
  handledTaps.add(tapId);

  const period =
    data.period === ReviewPeriodType.Monthly ? ReviewPeriodType.Monthly : ReviewPeriodType.Weekly;
  // openedAt starts the Review tab again on the latest letter, even when it is already open.
  return {
    pathname: "/(protected)/(tabs)/review",
    params: { period, openedAt: String(Date.now()) },
  };
}

// For the sign-in gate: where to land when a letter reminder started the app, or null for Home.
// The gate makes it a single navigation: one started as the tabs mount gets replaced by the
// gate's own redirect to Home.
export function takeLaunchReviewHref(): Href | null {
  // Notification APIs throw on web.
  if (Platform.OS === "web") return null;

  const launchTap = Notifications.getLastNotificationResponse();
  if (!launchTap) return null;

  const href = getReviewLetterHref(launchTap);
  // So a later JS reload doesn't open it again.
  if (href) Notifications.clearLastNotificationResponse();
  return href;
}

// A letter reminder tapped while the app is running opens its weekly or monthly letter.
export function useOpenReviewFromReminder() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const href = getReviewLetterHref(response);
      // dismissTo goes back to the tabs already open under any stack screen instead of adding a
      // second set.
      if (href) router.dismissTo(href);
    });
    return () => subscription.remove();
  }, []);
}
