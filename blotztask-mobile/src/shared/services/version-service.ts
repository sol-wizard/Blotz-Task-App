import * as Application from "expo-application";
import { Platform } from "react-native";

export type UpdateCheckResult = {
  isUpToDate: boolean;
  isForceUpdate: boolean;
  storeUrl: string | null;
};

export type PlatformVersionPolicy = {
  latestVersion: string;
  minimumSupportVersion: string;
  storeUrl: string;
};

export type AppVersionResponse = {
  ios: PlatformVersionPolicy;
  android: PlatformVersionPolicy;
};

export const checkForUpdate = async (): Promise<UpdateCheckResult> => {
  const isProduction = process.env.EXPO_PUBLIC_APP_ENV === "production";
  if (!isProduction) return { isUpToDate: true, isForceUpdate: false, storeUrl: null };

  // TODO: Skip andoid check for now, need to figure out the best way to do it
  const versionInfo = await fetchAppVersion();
  const platform = Platform.OS === "ios" ? versionInfo.ios : versionInfo.android;
  const currentVersion = Application.nativeApplicationVersion;

  if (!currentVersion) return { isUpToDate: true, isForceUpdate: false, storeUrl: null };

  if (isNewerVersion(platform.minimumSupportVersion, currentVersion)) {
    return { isUpToDate: false, isForceUpdate: true, storeUrl: platform.storeUrl };
  }

  return {
    isUpToDate: !isNewerVersion(platform.latestVersion, currentVersion),
    isForceUpdate: false,
    storeUrl: platform.storeUrl,
  };
};

const fetchAppVersion = async (): Promise<AppVersionResponse> => {
  const res = await fetch(`${process.env.EXPO_PUBLIC_URL_WITH_API}/app-version`);
  if (!res.ok) throw new Error("Failed to fetch app version");
  return res.json();
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
