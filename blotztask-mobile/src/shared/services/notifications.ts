import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { upsertPushToken } from "./user-service";

const PUSH_TOKEN_CACHE_KEY = "push_token";

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

async function handlePushTokenUpdate(token: string) {
  console.log("start handlePushTokenUpdate:", token);
  const cachedToken = await AsyncStorage.getItem(PUSH_TOKEN_CACHE_KEY);
  if (cachedToken === token) return;

  const deviceId =
    Platform.OS === "android"
      ? Application.getAndroidId()
      : await Application.getIosIdForVendorAsync();
  if (!deviceId) return;

  await upsertPushToken({ token, deviceId });
  await AsyncStorage.setItem(PUSH_TOKEN_CACHE_KEY, token);
}
