import { useTranslation } from "react-i18next";
import { buildMilestonePayload } from "../utils/pomodoro-milestone";

export function usePomodoroMilestoneTitle(elapsedMinutes: number) {
  const { t } = useTranslation("pomodoro");
  const payload = buildMilestonePayload(elapsedMinutes);

  if (payload) {
    return {
      title: t("focusMode.milestoneTitle", {
        value: payload.displayValue,
        unit: t(`focusMode.unit.${payload.unit}`, { count: payload.unitCount }),
      }),
      subtitle: t("focusMode.milestoneSubtitle"),
    };
  }

  return {
    title: t("focusMode.defaultTitle"),
    subtitle: t("focusMode.defaultSubtitle"),
  };
}
