import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Alert, Platform } from "react-native";
import { STORAGE_KEYS } from "../constants/storage-keys";
import { upsertPushToken } from "./user-service";

export async function registerForPushNotificationsAsync(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("blotzNotificationChannel", {
      name: "A channel is needed for the permissions prompt to appear",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const settings = await Notifications.getPermissionsAsync();
  let granted =
    settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (!granted) {
    const { granted: requestGranted } = await Notifications.requestPermissionsAsync();
    granted = requestGranted;
  }

  if (!granted) return;

  const token = await getExpoPushTokenAsync();
  if (token) {
    await handlePushTokenUpdate(token);
  }
}

async function getExpoPushTokenAsync(): Promise<string | null> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (error) {
    console.error("Error getting Expo push token:", error);
    return null;
  }
}

export function handleBadgeNotification(notification: Notifications.Notification): void {
  const data = notification.request.content.data;
  if (data?.type !== "badge") return;

  const badgeName = notification.request.content.body ?? "";
  const description = (data?.description as string | undefined) ?? "";

  Alert.alert(badgeName, description);
  // TODO: On OK dismiss, notify backend that this badge notification has been displayed (markBadgeAsDisplayed).
  // TODO: On app launch, add a backend catch-up service to fetch all badges where displayed=false and re-show them.
}

async function handlePushTokenUpdate(token: string) {
  const cachedToken = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
  if (cachedToken === token) return;

  const deviceId =
    Platform.OS === "android"
      ? Application.getAndroidId()
      : await Application.getIosIdForVendorAsync();
  if (!deviceId) return;

  await upsertPushToken({ token, deviceId });
  await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
}
