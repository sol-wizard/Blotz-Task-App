import { View, Text, ActivityIndicator } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { format, parseISO } from "date-fns";
import useSelectedDayTasks from "@/shared/hooks/useSelectedDayTasks";
import { theme } from "@/shared/constants/theme";
import i18n from "@/i18n";

export const SelectedDayDetailPanel = ({ selectedDay }: { selectedDay: Date }) => {
  const { selectedDayTasks, isLoading } = useSelectedDayTasks({ selectedDay });

  return (
    <View className="flex-1 px-5">
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.onSurface} className="mt-10" />
      ) : (
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {selectedDayTasks.length > 0 ? (
            selectedDayTasks.map((task, index) => {
              const start = parseISO(task.startTime);
              const end = parseISO(task.endTime);
              const isSameTime = task.startTime === task.endTime;

              return (
                <View
                  key={task.id || index}
                  className="flex-row items-center bg-white border border-gray-100 rounded-2xl mb-2 py-3 px-4 shadow-xs"
                >
                  {/* Column 1: Time */}
                  <View className="w-16">
                    <View className="flex-row items-baseline">
                      <Text className="text-base font-baloo text-secondary">
                        {format(start, "h:mm")}
                      </Text>
                      <Text className="text-xs font-baloo text-secondary ml-0.5 uppercase">
                        {format(start, "a")}
                      </Text>
                    </View>
                    {!isSameTime && (
                      <View className="flex-row items-baseline mt-0 opacity-50">
                        <Text className="text-sm font-baloo text-secondary">
                          {format(end, "h:mm")}
                        </Text>
                        <Text className="text-xs font-baloo text-secondary ml-0.5 uppercase">
                          {format(end, "a")}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Column 2: Color Bar */}
                  <View
                    className="w-1 h-6 rounded-full mx-3"
                    style={{ backgroundColor: task.label?.color ?? theme.colors.disabled }}
                  />

                  {/* Column 3: Title */}
                  <View className="flex-1">
                    <Text className="text-base font-baloo text-secondary leading-tight">
                      {task.title}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text className="text-center text-gray-400 mt-10 font-baloo">
              {i18n.t("calendar:emptyState.all.title")}
            </Text>
          )}
        </BottomSheetScrollView>
      )}
    </View>
  );
};
