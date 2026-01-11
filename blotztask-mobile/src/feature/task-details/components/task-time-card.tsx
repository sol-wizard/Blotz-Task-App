import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatTaskTime } from "../utils/format-task-time";
import { theme } from "@/shared/constants/theme";

export const TaskSingleTimeCard = ({ startTime }: { startTime: string }) => {
  const { t } = useTranslation("tasks");
  const time = formatTaskTime(startTime);
  return (
    <View className="flex-row items-center py-3">
      <MaterialIcons name="schedule" size={20} color={theme.colors.onSurface} />
      <Text className="ml-2 text-primary font-balooThin">{t("details.time")}</Text>
      <Text className="ml-2 text-secondary font-baloo text-lg">{time}</Text>
    </View>
  );
};

export const TaskRangeTimeCard = ({
  startTime,
  endTime,
}: {
  startTime: string;
  endTime: string;
}) => {
  const { t } = useTranslation("tasks");
  const formattedStartTime = formatTaskTime(startTime);
  const formattedEndTime = formatTaskTime(endTime);

  return (
    <View className="flex-row items-center py-3">
      <MaterialCommunityIcons
        name="calendar-range-outline"
        size={20}
        color={theme.colors.onSurface}
      />
      <Text className="ml-2 text-primary font-balooThin">{t("details.startFrom")}</Text>
      <Text className="ml-2 text-secondary font-baloo text-lg">{formattedStartTime}</Text>
      <Text className="ml-4 text-primary font-balooThin">{t("details.endAt")}</Text>
      <Text className="ml-2 text-secondary font-baloo text-lg">{formattedEndTime}</Text>
    </View>
  );
};
