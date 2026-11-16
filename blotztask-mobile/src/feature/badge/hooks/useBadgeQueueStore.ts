import { create } from "zustand";
import { BadgeNotificationDTO } from "@/feature/badge/models/badge-notification-dto";

interface BadgeQueueState {
  /** Badges waiting for the achievement pop-up, from a push or from an API response. */
  queue: BadgeNotificationDTO[];
  enqueue: (badge: BadgeNotificationDTO) => void;
  dismiss: () => void;
}

export const useBadgeQueueStore = create<BadgeQueueState>((set) => ({
  queue: [],
  enqueue: (badge) =>
    set((state) =>
      state.queue.some((queued) => queued.badgeId === badge.badgeId)
        ? state
        : { queue: [...state.queue, badge] },
    ),
  dismiss: () => set((state) => ({ queue: state.queue.slice(1) })),
}));
