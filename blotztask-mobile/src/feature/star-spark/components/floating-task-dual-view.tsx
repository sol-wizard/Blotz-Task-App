import { FloatingTaskDTO } from "../models/floating-task-dto";
import { View, ScrollView, Pressable } from "react-native";
import { useState, useRef } from "react";
import { FloatingTaskCard } from "./floating-task-card";

type ToggledMap = Record<number, boolean>;
export type LayoutInfo = { x: number; y: number; width: number; height: number };

export const FloatingTaskDualView = ({
  tasks,
  onDeleteTask,
  isDeleting,
  onPressTask,
  onFirstItemLayout,
  isOnboarding,
}: {
  tasks: FloatingTaskDTO[];
  onDeleteTask: (t: FloatingTaskDTO) => void;
  isDeleting: boolean;
  onPressTask: (task: FloatingTaskDTO) => void;
  onFirstItemLayout?: (layout: LayoutInfo) => void;
  isOnboarding?: boolean;
}) => {
  const [toggledMap, setToggledMap] = useState<ToggledMap>({});
  const firstItemRef = useRef<View>(null);

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

  const measureFirstItem = () => {
    setTimeout(() => {
      firstItemRef.current?.measureInWindow((x, y, width, height) => {
        onFirstItemLayout?.({ x, y, width, height });
      });
    }, 200); // 给 200ms 让页面排版完全稳定
  };

  return (
    <Pressable onPress={dismissAll} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <View className="flex-row">
          <View className="flex-1 mr-1.5">
            {leftColumn.map((item, index) => {
              const isFirst = index === 0;
              return (
                <View
                  key={item.id} // <--- 必须在这里！
                  ref={isFirst ? firstItemRef : null}
                  onLayout={isFirst ? measureFirstItem : undefined}
                  style={{ zIndex: isFirst && isOnboarding ? 20 : 1 }}
                >
                  <FloatingTaskCard
                    key={item.id}
                    floatingTask={item}
                    isToggled={!!toggledMap[item.id]}
                    onToggle={() => handleToggle(item.id)}
                    onDelete={onDeleteTask}
                    isDeleting={isDeleting}
                    onPressCard={onPressTask}
                  />
                </View>
              );
            })}
          </View>

          <View className="flex-1 ml-1.5">
            {rightColumn.map((item) => {
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
