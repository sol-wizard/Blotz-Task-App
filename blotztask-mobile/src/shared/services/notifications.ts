import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
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
  if (
    !settings.granted &&
    settings.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    const { granted: requestGranted } = await Notifications.requestPermissionsAsync();
    if (!requestGranted) {
      alert("Failed to get push token for push notification!");
    }
    const token = await getExpoPushTokenAsync();
    if (token) {
      await handlePushTokenUpdate(token);
    }
  }
}

async function getExpoPushTokenAsync(): Promise<string | null> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (error) {
    console.error("Error getting Expo push token:", error);
    return null;
  }
}

async function handlePushTokenUpdate(token: string) {
  const deviceId =
    Platform.OS === "android"
      ? Application.getAndroidId()
      : await Application.getIosIdForVendorAsync();
  if (!deviceId) return;
  await upsertPushToken({ token, deviceId });
}
