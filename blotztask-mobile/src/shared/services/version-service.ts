import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Application from "expo-application";
import { Platform } from "react-native";
import { traced } from "./api/client";
import { API_CONFIG } from "./api/config";

// `/app-version` is anonymous. The shared `apiClient` waits for a valid token before every
// request, which can mean an Auth0 refresh round trip; this client skips that wait.
const anonymousClient = axios.create(API_CONFIG);

const SAVED_POLICY_KEY = "app_version_policy";

export type UpdateCheckResult =
  | { kind: "upToDate" }
  | { kind: "outdated"; storeUrl: string }
  | { kind: "forcedUpdate"; storeUrl: string };

export type PlatformVersionPolicy = {
  latestVersion: string;
  minimumSupportedVersion: string;
  storeUrl: string;
  /** Website download page for APK installs. Empty or missing → use storeUrl. */
  apkDownloadUrl?: string;
};

export type AppVersionResponse = {
  ios: PlatformVersionPolicy;
  android: PlatformVersionPolicy;
};

const isVersionCheckEnabled = () => {
  const env = process.env.EXPO_PUBLIC_APP_ENV;
  return env === "production" || env === "preview";
};

/**
 * Fetches this platform's version policy and saves it on the phone, so the next launch can
 * decide at the splash without waiting for the network. `null` when the check is off.
 */
export const fetchAndSaveVersionPolicy = async (): Promise<PlatformVersionPolicy | null> => {
  if (!isVersionCheckEnabled()) return null;

  const versionInfo = await fetchAppVersion();
  const platform = Platform.OS === "ios" ? versionInfo.ios : versionInfo.android;
  // Best effort: a failed save only means the next launch waits for this check again.
  await AsyncStorage.setItem(SAVED_POLICY_KEY, JSON.stringify(platform)).catch(() => undefined);
  return platform;
};

/** The policy saved by the last successful check, or `null` if there is none. */
export const loadSavedVersionPolicy = async (): Promise<PlatformVersionPolicy | null> => {
  try {
    const saved = await AsyncStorage.getItem(SAVED_POLICY_KEY);
    return saved ? (JSON.parse(saved) as PlatformVersionPolicy) : null;
  } catch {
    return null;
  }
};

// Compared with the installed version each time, so a saved "forced" policy stops
// applying as soon as the user has updated.
export const evaluateVersionPolicy = (
  platform: PlatformVersionPolicy | null,
): UpdateCheckResult => {
  if (!platform) return { kind: "upToDate" };

  const currentVersion = Application.nativeApplicationVersion;

  if (!platform.minimumSupportedVersion) {
    return { kind: "upToDate" };
  }
  if (!currentVersion) return { kind: "upToDate" };

  // APK installs (China, no Google Play) update from the website download page. Play builds must
  // keep updating through Play only (Play policy), and only the APK build profiles set this flag.
  const isApkBuild = process.env.EXPO_PUBLIC_DISTRIBUTION === "apk";
  const updateUrl =
    isApkBuild && platform.apkDownloadUrl ? platform.apkDownloadUrl : platform.storeUrl;

  if (isNewerVersion(platform.minimumSupportedVersion, currentVersion)) {
    return { kind: "forcedUpdate", storeUrl: updateUrl };
  }
  if (isNewerVersion(platform.latestVersion, currentVersion)) {
    return { kind: "outdated", storeUrl: updateUrl };
  }
  return { kind: "upToDate" };
};

const fetchAppVersion = async (): Promise<AppVersionResponse> => {
  try {
    return await traced(
      "GET",
      "/app-version",
      async () => (await anonymousClient.get<AppVersionResponse>("/app-version")).data,
    );
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
