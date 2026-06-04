import * as Application from "expo-application";
import { Platform } from "react-native";
import { apiClient } from "./api/client";

export type UpdateCheckResult =
  | { kind: "upToDate" }
  | { kind: "outdated"; storeUrl: string }
  | { kind: "forcedUpdate"; storeUrl: string };

export type PlatformVersionPolicy = {
  latestVersion: string;
  minimumSupportedVersion: string;
  storeUrl: string;
};

export type AppVersionResponse = {
  ios: PlatformVersionPolicy;
  android: PlatformVersionPolicy;
};

export const checkForUpdate = async (): Promise<UpdateCheckResult> => {
  const isProduction = process.env.EXPO_PUBLIC_APP_ENV === "production";
  if (!isProduction) return { kind: "upToDate" };

  const versionInfo = await fetchAppVersion();
  const platform = Platform.OS === "ios" ? versionInfo.ios : versionInfo.android;
  const currentVersion = Application.nativeApplicationVersion;

  if (!platform.minimumSupportedVersion) {
    return { kind: "upToDate" };
  }
  if (!currentVersion) return { kind: "upToDate" };

  if (isNewerVersion(platform.minimumSupportedVersion, currentVersion)) {
    return { kind: "forcedUpdate", storeUrl: platform.storeUrl };
  }
  if (isNewerVersion(platform.latestVersion, currentVersion)) {
    return { kind: "outdated", storeUrl: platform.storeUrl };
  }
  return { kind: "upToDate" };
};

const fetchAppVersion = async (): Promise<AppVersionResponse> => {
  try {
    return await apiClient.get<AppVersionResponse>("/app-version");
  } catch (error) {
    console.error("Failed to fetch app version policy", error);
    throw error;
  }
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
