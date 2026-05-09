import { useEffect, useState } from "react";

// Activates for `duration` ms each time trigger() is called, then resets.
// Uses a counter instead of a boolean so that calling trigger() while already
// active always restarts the timer — if we used a boolean, setActive(true)
// while active is already true would be a no-op and the timer would not reset.
export function useHoldHint(duration: number) {
  const [triggerCount, setTriggerCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (triggerCount === 0) return;
    setIsVisible(true);
    const timer = setTimeout(() => setIsVisible(false), duration);
    return () => clearTimeout(timer);
  }, [triggerCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isHoldHintVisible: isVisible,
    showHoldHint: () => setTriggerCount((c) => c + 1),
    hideHoldHint: () => setIsVisible(false),
  };
}
