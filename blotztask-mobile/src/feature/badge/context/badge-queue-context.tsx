import { usePushNotificationSetup } from "@/shared/hooks/usePushNotificationSetup";
import { createContext, ReactNode, useContext } from "react";

type BadgeQueueContextValue = ReturnType<typeof usePushNotificationSetup>;

const BadgeQueueContext = createContext<BadgeQueueContextValue | null>(null);

export function BadgeQueueProvider({ children }: { children: ReactNode }) {
  const value = usePushNotificationSetup();
  return <BadgeQueueContext.Provider value={value}>{children}</BadgeQueueContext.Provider>;
}

export function useBadgeQueue() {
  const context = useContext(BadgeQueueContext);
  if (!context) {
    throw new Error("useBadgeQueue must be used within BadgeQueueProvider");
  }
  return context;
}
