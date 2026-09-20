import { create } from "zustand";

interface VoiceCoachState {
  /** In memory on purpose: the coach belongs to the session that just finished onboarding. */
  isVisible: boolean;
  show: () => void;
  hide: () => void;
}

export const useVoiceCoachStore = create<VoiceCoachState>((set) => ({
  isVisible: false,
  show: () => set({ isVisible: true }),
  hide: () => set({ isVisible: false }),
}));
