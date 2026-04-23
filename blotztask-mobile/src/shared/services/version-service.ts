import * as Application from "expo-application";
import { Platform } from "react-native";

export type UpdateCheckResult = {
  isUpToDate: boolean;
  storeUrl: string | null;
};

export const checkForUpdate = async (): Promise<UpdateCheckResult> => {
  const isProduction = process.env.EXPO_PUBLIC_APP_ENV === "production";
  const isIOS = Platform.OS === "ios";

  // TODO: Skip andoid check for now, need to figure out the best way to do it
  if (!isProduction || !isIOS) return { isUpToDate: true, storeUrl: null };

  const { latestVersion, currentVersion, storeUrl } = await checkIOSVersion();

  if (!currentVersion) return { isUpToDate: true, storeUrl: null };

  return {
    isUpToDate: !isNewerVersion(latestVersion, currentVersion),
    storeUrl,
  };
};

const checkIOSVersion = async () => {
  const bundleId = Application.applicationId;

  const res = await fetch(`https://itunes.apple.com/lookup?bundleId=${bundleId}`);
  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("App not found in App Store");
  }

  const latestVersion: string = data.results[0].version;
  const storeUrl: string = data.results[0].trackViewUrl;
  const currentVersion = Application.nativeApplicationVersion;

  return { currentVersion, latestVersion, storeUrl };
};

const isNewerVersion = (latest: string, current: string): boolean => {
  const latestParts = latest.split(".").map(Number);
  const currentParts = current.split(".").map(Number);
  const length = Math.max(latestParts.length, currentParts.length);

  for (let i = 0; i < length; i++) {
    const l = latestParts[i] ?? 0;
    const c = currentParts[i] ?? 0;
    if (l > c) return true;
    if (l < c) return false;
  }

  return false;
};
