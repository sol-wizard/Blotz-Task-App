import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

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

  const play = useCallback(() => {
    setPlaybackKey((key) => key + 1);
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const playIfCompleting = useCallback(
    (wasDone: boolean) => {
      if (!wasDone) {
        play();
      }
    },
    [play],
  );

  return useMemo(
    () => ({ visible, playbackKey, play, dismiss, playIfCompleting }),
    [visible, playbackKey, play, dismiss, playIfCompleting],
  );
}

export function FireworkProvider({ children }: { children: ReactNode }) {
  const task = useFireworkSlot();
  const subtask = useFireworkSlot();

  const value = useMemo(() => ({ task, subtask }), [task, subtask]);

  return <FireworkContext.Provider value={value}>{children}</FireworkContext.Provider>;
}

export function useFirework() {
  const context = useContext(FireworkContext);
  if (context == null) {
    throw new Error("useFirework must be used within FireworkProvider");
  }
  return context;
}
