import { RefObject, useRef } from "react";
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
  const openRefObject = useRef<RefObject<SwipeableMethods | null> | null>(null);

  const onRowOpen = (refObject: RefObject<SwipeableMethods | null>) => {
    if (openRefObject.current && openRefObject.current !== refObject) {
      openRefObject.current.current?.close();
    }
    openRefObject.current = refObject;
  };

  const closeAllRows = () => {
    openRefObject.current?.current?.close();
    openRefObject.current = null;
  };

  return { onRowOpen, closeAllRows };
};
