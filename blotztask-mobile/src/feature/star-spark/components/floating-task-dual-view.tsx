import { FloatingTaskDTO } from "../models/floating-task-dto";
import { View, ScrollView, Pressable } from "react-native";
import { useState } from "react";
import { FloatingTaskCard } from "./floating-task-card";

type ToggledMap = Record<number, boolean>;

export const FloatingTaskDualView = ({
  tasks,
  onDeleteTask,
  isDeleting,
  onPressTask,
}: {
  tasks: FloatingTaskDTO[];
  onDeleteTask: (id: number) => void;
  isDeleting: boolean;
  onPressTask: (task: FloatingTaskDTO) => void;
}) => {
  const [toggledMap, setToggledMap] = useState<ToggledMap>({});

  const handleToggle = (id: number) => {
    setToggledMap((prev) => {
      const isOn = !!prev[id];
      if (isOn) return {};
      return { [id]: true };
    });
  };

  const dismissAll = () => setToggledMap({});

  const leftColumn = tasks.filter((_, index) => index % 2 === 0);
  const rightColumn = tasks.filter((_, index) => index % 2 === 1);

  return (
    <Pressable onPress={dismissAll} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <View className="flex-row">
          <View className="flex-1 mr-1.5">
            {leftColumn.map((item) => {
              const isToggled = !!toggledMap[item.id];
              return (
                <FloatingTaskCard
                  key={item.id}
                  floatingTask={item}
                  isToggled={!!toggledMap[item.id]}
                  onToggle={() => handleToggle(item.id)}
                  onDelete={onDeleteTask}
                  isDeleting={isDeleting} // ⭐ 每张卡都拿到同一个 isDeleting
                  onPressCard={onPressTask}
                />
              );
            })}
          </View>

          <View className="flex-1 ml-1.5">
            {rightColumn.map((item) => {
              const isToggled = !!toggledMap[item.id];
              return (
                <FloatingTaskCard
                  key={item.id}
                  floatingTask={item}
                  isToggled={!!toggledMap[item.id]}
                  onToggle={() => handleToggle(item.id)}
                  onDelete={onDeleteTask}
                  isDeleting={isDeleting}
                  onPressCard={onPressTask}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
    </Pressable>
  );
};
