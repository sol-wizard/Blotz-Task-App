import { useEffect, useState } from "react";

// Activates for `duration` ms each time trigger() is called, then resets.
// Uses a counter instead of a boolean so that calling trigger() while already
// active always restarts the timer — if we used a boolean, setActive(true)
// while active is already true would be a no-op and the timer would not reset.
export function useHoldHint(duration: number) {
  const [triggerCount, setTriggerCount] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (triggerCount === 0) return;
    setActive(true);
    const timer = setTimeout(() => setActive(false), duration);
    return () => clearTimeout(timer);
  }, [triggerCount, duration]);

  return { active, trigger: () => setTriggerCount((c) => c + 1) };
}
