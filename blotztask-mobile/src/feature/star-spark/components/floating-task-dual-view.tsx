import { FloatingTaskDTO } from "../models/floatingTaskDto";
import { View, ScrollView } from "react-native";
import { useState } from "react";
import { FloatingTaskCard } from "./floating-task-card";

type ToggledMap = Record<number, boolean>;

export const FloatingTaskDualView = ({ tasks }: { tasks: FloatingTaskDTO[] }) => {
  const [toggledMap, setToggledMap] = useState<ToggledMap>({});

  const handleToggle = (id: number) => {
    setToggledMap((prev) => {
      const isOn = !!prev[id];
      if (isOn) return {};
      return { [id]: true };
    });
  };

  const leftColumn = tasks.filter((_, index) => index % 2 === 0);
  const rightColumn = tasks.filter((_, index) => index % 2 === 1);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
      <View className="flex-row">
        <View className="flex-1 mr-1.5">
          {leftColumn.map((item) => {
            const isToggled = !!toggledMap[item.id];
            return (
              <FloatingTaskCard
                key={item.id}
                floatingTask={item}
                isToggled={isToggled}
                onToggle={() => handleToggle(item.id)}
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
                isToggled={isToggled}
                onToggle={() => handleToggle(item.id)}
              />
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
};
