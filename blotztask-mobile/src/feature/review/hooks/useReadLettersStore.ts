import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { ReviewPeriodType } from "../models/review-dto";

// The start date ("yyyy-MM-dd") of the latest weekly and monthly letter read on this phone.
type ReadLetters = Partial<Record<ReviewPeriodType, string>>;

interface ReadLettersState {
  /** Null until loaded from the phone. */
  read: ReadLetters | null;
  load: () => Promise<void>;
  markRead: (period: ReviewPeriodType, periodStart: string) => Promise<void>;
}

let loading: Promise<void> | null = null;

export const useReadLettersStore = create<ReadLettersState>((set, get) => ({
  read: null,
  load: () => {
    loading ??= AsyncStorage.getItem(STORAGE_KEYS.READ_REVIEW_LETTERS)
      .then((value) => (value ? (JSON.parse(value) as ReadLetters) : {}))
      // A missing or unreadable value just means nothing has been read yet.
      .catch(() => ({}))
      .then((read) => set({ read }));
    return loading;
  },
  markRead: async (period, periodStart) => {
    // Wait for the saved value, so this write doesn't drop the other period.
    await get().load();
    const read = get().read ?? {};
    if (read[period] === periodStart) return;

    const next = { ...read, [period]: periodStart };
    set({ read: next });
    AsyncStorage.setItem(STORAGE_KEYS.READ_REVIEW_LETTERS, JSON.stringify(next)).catch(() => {});
  },
}));

// Marks the latest letter read once its text is on screen, which clears the Review tab's red dot.
export function useMarkLetterRead(
  period: ReviewPeriodType,
  periodStart: string,
  isLatestLetterShown: boolean,
) {
  const markRead = useReadLettersStore((state) => state.markRead);

  useEffect(() => {
    if (isLatestLetterShown) void markRead(period, periodStart);
  }, [isLatestLetterShown, period, periodStart, markRead]);
}
