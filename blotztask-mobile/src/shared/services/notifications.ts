import * as Application from "expo-application";
import { EventSubscription } from "expo-modules-core";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { upsertPushToken } from "./user-service";

export function setupPushTokenListener(): EventSubscription {
  return Notifications.addPushTokenListener(async ({ data: token }) => {
    let deviceId: string;
    if (Platform.OS === "android") {
      deviceId = Application.getAndroidId();
    } else {
      const iosId = await Application.getIosIdForVendorAsync();
      if (!iosId) return;
      deviceId = iosId;
    }

    await upsertPushToken({ token, deviceId });
  });
}

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
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    const { granted: requestGranted } = await Notifications.requestPermissionsAsync();
    if (!requestGranted) {
      alert("Failed to get push token for push notification!");
    }
  }
}
