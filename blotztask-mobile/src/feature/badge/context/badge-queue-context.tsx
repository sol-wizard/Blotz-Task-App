import { BadgeNotificationDTO } from "@/feature/badge/models/badge-notification-dto";
import i18n from "@/i18n";
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

export function getTestBadge(): BadgeNotificationDTO {
  const isChinese = i18n.language.startsWith("zh");

  return {
    badgeId: 9001,
    name: isChinese ? "软陷吐司" : "Fluffy Ferment",
    description: isChinese
      ? "逾期两天的吐司，在慢慢发酵，会更松软！"
      : "Late, but fermenting. Getting softer by the minute.",
    iconUrl:
      "https://stgblotztaskstag.blob.core.windows.net/badge/TaskCompletion/overdue/fluffy-ferment.png",
    obtainedAt: new Date(),
  };
}
