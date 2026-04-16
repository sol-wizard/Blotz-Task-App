import { View, Text, ScrollView, Dimensions, ActivityIndicator } from "react-native";
import { format, parseISO } from "date-fns";
import useSelectedDayTasks from "@/shared/hooks/useSelectedDayTasks";
import { theme } from "@/shared/constants/theme";

export const SelectedDayDetailPanel = ({ selectedDay }: { selectedDay: Date }) => {
  const { selectedDayTasks, isLoading } = useSelectedDayTasks({ selectedDay });

  return (
    <View className="flex-1 px-5">
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.onSurface} className="mt-10" />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: Dimensions.get("window").height * 0.4 }}
        >
          {selectedDayTasks.length > 0 ? (
            selectedDayTasks.map((task, index) => {
              const start = parseISO(task.startTime);
              const end = parseISO(task.endTime);
              const isSameTime = task.startTime === task.endTime;

              return (
                <View
                  key={task.id || index}
                  className="flex-row items-center bg-white border border-gray-100 rounded-[16px] mb-2 py-2.5 px-4 shadow-xs"
                >
                  {/* Column 1: Time */}
                  <View className="w-[60px]">
                    <View className="flex-row items-baseline">
                      <Text className="text-[16px] font-baloo text-secondary">
                        {format(start, "h:mm")}
                      </Text>
                      <Text className="text-[12px] font-baloo text-secondary ml-0.5 uppercase">
                        {format(start, "a")}
                      </Text>
                    </View>
                    {!isSameTime && (
                      <View className="flex-row items-baseline mt-0 opacity-50">
                        <Text className="text-[14px] font-baloo text-secondary">
                          {format(end, "h:mm")}
                        </Text>
                        <Text className="text-[11px] font-baloo text-secondary ml-0.5 uppercase">
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
                    <Text className="text-[15px] font-baloo text-secondary leading-tight">
                      {task.title}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text className="text-center text-gray-400 mt-10 font-baloo">No tasks for this day</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
};
