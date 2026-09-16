import { Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";

type Props = {
  tasksCompleted: number | null;
};

type Stat = {
  key: string;
  value: number;
  label: string;
  icon: "check-circle";
  color: string;
};

// The design shows three stats, but only tasksCompleted has a data source today — so the row
// renders whichever stats it was given rather than a fixed three.
export function LetterStats({ tasksCompleted }: Props) {
  const { t } = useTranslation("settings");

  const stats: Stat[] = [];

  if (tasksCompleted !== null) {
    stats.push({
      key: "tasksCompleted",
      value: tasksCompleted,
      label: t("monthlyReview.tasksCompleted"),
      icon: "check-circle",
      color: "#84CC16",
    });
  }

  if (stats.length === 0) return null;

  return (
    <View className="flex-row mb-5 gap-x-9">
      {stats.map((stat) => (
        <View key={stat.key}>
          <View className="flex-row items-center">
            <MaterialCommunityIcons name={stat.icon} size={18} color={stat.color} />

            <Text className="ml-1.5 text-xl font-balooBold" style={{ color: stat.color }}>
              {stat.value}
            </Text>
          </View>

          <Text className="mt-0.5 text-xs font-baloo text-secondary/50">{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}
