import type { BadgePreviewDTO } from "@/feature/badge/models/badge-preview-dto";
import { useRef } from "react";
import { Pressable, View } from "react-native";
import { BadgeCard } from "./badge-card";

export interface BadgeSourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnimatedBadgeItemProps {
  badge: BadgePreviewDTO;
  isHidden: boolean;
  onRevealStart: (badgeId: number) => boolean;
  onRevealReady: (badge: BadgePreviewDTO, sourceRect: BadgeSourceRect) => void;
  onRevealCancel: (badgeId: number) => void;
}

export function AnimatedBadgeItem({
  badge,
  isHidden,
  onRevealStart,
  onRevealReady,
  onRevealCancel,
}: AnimatedBadgeItemProps) {
  const badgeContainerRef = useRef<View>(null);

  const handlePress = () => {
    if (!onRevealStart(badge.id)) return;

    const container = badgeContainerRef.current;
    if (!container) {
      onRevealCancel(badge.id);
      return;
    }

    container.measureInWindow((x, y, width) => {
      if (width <= 0) {
        onRevealCancel(badge.id);
        return;
      }

      onRevealReady(badge, {
        x,
        y,
        width,
        // BadgeCard's visual tile is square; the label below it stays on the wall.
        height: width,
      });
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isHidden}
      accessibilityRole="button"
      accessibilityLabel={badge.name}
    >
      <View ref={badgeContainerRef} collapsable={false} style={{ opacity: isHidden ? 0 : 1 }}>
        <BadgeCard badge={badge} transparent />
      </View>
    </Pressable>
  );
}
