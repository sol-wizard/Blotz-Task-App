import { createContext, useContext, useState, type ReactNode } from "react";

export type FireworkVariant = "task" | "subtask";

type FireworkSlot = {
  visible: boolean;
  playbackKey: number;
  play: () => void;
  dismiss: () => void;
  playIfCompleting: (wasDone: boolean) => void;
};

type FireworkContextValue = Record<FireworkVariant, FireworkSlot>;

const FireworkContext = createContext<FireworkContextValue | null>(null);

function useFireworkSlot(): FireworkSlot {
  const [playbackKey, setPlaybackKey] = useState(0);
  const [visible, setVisible] = useState(false);

  const play = () => {
    setPlaybackKey((key) => key + 1);
    setVisible(true);
  };

  const dismiss = () => {
    setVisible(false);
  };

  const playIfCompleting = (wasDone: boolean) => {
    if (!wasDone) {
      play();
    }
  };

  return { visible, playbackKey, play, dismiss, playIfCompleting };
}

export function FireworkProvider({ children }: { children: ReactNode }) {
  const task = useFireworkSlot();
  const subtask = useFireworkSlot();

  return (
    <FireworkContext.Provider value={{ task, subtask }}>{children}</FireworkContext.Provider>
  );
}

export function useFirework() {
  const context = useContext(FireworkContext);
  if (context == null) {
    throw new Error("useFirework must be used within FireworkProvider");
  }
  return context;
}
