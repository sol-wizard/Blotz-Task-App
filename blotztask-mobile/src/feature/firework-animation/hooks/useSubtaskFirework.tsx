import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type SubtaskFireworkContextValue = {
  visible: boolean;
  playbackKey: number;
  playSubtaskFirework: () => void;
  dismissSubtaskFirework: () => void;
};

const SubtaskFireworkContext = createContext<SubtaskFireworkContextValue | null>(null);

export function SubtaskFireworkProvider({ children }: { children: ReactNode }) {
  const [playbackKey, setPlaybackKey] = useState(0);
  const [visible, setVisible] = useState(false);

  const playSubtaskFirework = useCallback(() => {
    setPlaybackKey((key) => key + 1);
    setVisible(true);
  }, []);

  const dismissSubtaskFirework = useCallback(() => {
    setVisible(false);
  }, []);

  const value = useMemo(
    () => ({ visible, playbackKey, playSubtaskFirework, dismissSubtaskFirework }),
    [visible, playbackKey, playSubtaskFirework, dismissSubtaskFirework],
  );

  return (
    <SubtaskFireworkContext.Provider value={value}>{children}</SubtaskFireworkContext.Provider>
  );
}

export function useSubtaskFirework() {
  const context = useContext(SubtaskFireworkContext);
  if (context == null) {
    throw new Error("useSubtaskFirework must be used within SubtaskFireworkProvider");
  }
  return context;
}
