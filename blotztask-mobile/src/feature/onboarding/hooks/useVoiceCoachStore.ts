import { create } from "zustand";

type ButtonFrame = { x: number; y: number; width: number; height: number };

interface VoiceCoachState {
  /** In memory on purpose: the coach belongs to the session that just finished onboarding. */
  isVisible: boolean;
  /** Window frame of the real AI tab button, so the spotlight sits exactly on it. */
  buttonFrame: ButtonFrame | null;
  show: () => void;
  hide: () => void;
  setButtonFrame: (frame: ButtonFrame) => void;
}

export const useVoiceCoachStore = create<VoiceCoachState>((set) => ({
  isVisible: false,
  buttonFrame: null,
  show: () => set({ isVisible: true }),
  hide: () => set({ isVisible: false }),
  setButtonFrame: (buttonFrame) => set({ buttonFrame }),
}));
