import { useTranslation } from "react-i18next";
import { buildMilestonePayload } from "../utils/pomodoro-milestone";

export function usePomodoroMilestoneTitle(elapsedMinutes: number) {
  const { t } = useTranslation("pomodoro");
  const payload = buildMilestonePayload(elapsedMinutes);

  // 已经达到了 30 分钟、60 分钟等里程碑
  if (payload) {
    return {
      title: t("focusMode.milestoneTitle", {
        value: payload.displayValue,
        unit: t(`focusMode.unit.${payload.unit}`, { count: payload.unitCount }),
      }),
      subtitle: t("focusMode.milestoneSubtitle"),
    };
  }

  // 0 ~ 29 分钟的默认状态
  return {
    title: t("focusMode.defaultTitle"),
    subtitle: t("focusMode.defaultSubtitle"),
  };
}
