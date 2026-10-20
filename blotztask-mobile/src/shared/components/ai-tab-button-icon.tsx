import { ASSETS } from "@/shared/constants/assets";
import { GradientCircle } from "@/shared/components/gradient-circle";

export const AI_TAB_BUTTON_SIZE = 58;

/** The AI button as drawn in the tab bar. The voice coach draws the same one on top of it. */
export function AiTabButtonIcon() {
  return (
    <GradientCircle size={AI_TAB_BUTTON_SIZE}>
      <ASSETS.whiteBun width={28} height={28} style={{ position: "absolute" } as const} />
    </GradientCircle>
  );
}
