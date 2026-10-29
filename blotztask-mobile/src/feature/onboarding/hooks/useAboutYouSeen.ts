import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

// Per user, so a second account on the same phone is still asked once.
const storageKey = (userId: string) => `about_you_seen_${userId}`;

/**
 * Whether this user has already been through the "About you" questions on this device
 * (answered or skipped). `null` while the user id or the stored value is not known yet.
 */
export function useAboutYouSeen(userId: string | undefined) {
  // Remember which user the value belongs to, so switching accounts reads as "not known yet".
  const [loaded, setLoaded] = useState<{ userId: string; seen: boolean } | null>(null);
  const hasSeen = userId && loaded?.userId === userId ? loaded.seen : null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    AsyncStorage.getItem(storageKey(userId))
      .then((value) => {
        if (!cancelled) setLoaded({ userId, seen: value === "1" });
      })
      // Unreadable storage: treat as seen rather than risk asking on every launch.
      .catch(() => {
        if (!cancelled) setLoaded({ userId, seen: true });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const markAsSeen = async () => {
    if (!userId) return;
    setLoaded({ userId, seen: true });
    await AsyncStorage.setItem(storageKey(userId), "1").catch(() => {});
  };

  return { hasSeen, markAsSeen };
}
