import { useRef } from "react";
import { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";

/**
 * Manages a single open swipeable row.
 *
 * When a new row is opened the previous one (if any) is closed
 * automatically. The hook also exposes a helper for closing whatever
 * row is currently open (useful when navigating away from the list or
 * dismissing the keyboard).
 */
export const useSwipeableManager = () => {
  const openRef = useRef<SwipeableMethods | null>(null);

  const onRowOpen = (ref: SwipeableMethods | null) => {
    if (openRef.current && openRef.current !== ref) {
      openRef.current.close();
    }
    openRef.current = ref;
  };

  const closeAllRows = () => {
    openRef.current?.close();
    openRef.current = null;
  };

  return { onRowOpen, closeAllRows };
};
