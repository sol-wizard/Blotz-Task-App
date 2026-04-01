import { View, Text, FlatList } from "react-native";
import { ReturnButton } from "@/shared/components/ui/return-button";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAllDdl } from "../hooks/useAllDdl";
import DdlCard from "../components/ddl-card";
import { DeadlineTaskDTO } from "../models/deadline-task-dto";

export default function DdlScreen() {
  const { t } = useTranslation("deadline");
  const { ddlTasks, isLoading } = useAllDdl();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row px-6 mt-6 items-center">
        <ReturnButton />
        <Text className="font-baloo text-4xl text-secondary font-bold px-6 py-2">{t("title")}</Text>
      </View>

      <FlatList
        data={ddlTasks}
        keyExtractor={(item: DeadlineTaskDTO) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, gap: 12 }}
        renderItem={({ item }) => <DdlCard task={item} />}
      />
    </SafeAreaView>
  );
}
