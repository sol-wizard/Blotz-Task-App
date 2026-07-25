import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { WHATS_NEW_VERSION } from "../content/cards";

const STORAGE_KEY = `whats_new_seen_${WHATS_NEW_VERSION}`;

export function useWhatsNewSeen() {
  const [hasSeen, setHasSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      setHasSeen(value === "1");
    });
  }, []);

  const markAsSeen = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "1");
    setHasSeen(true);
  };

  return { hasSeen, markAsSeen };
}
