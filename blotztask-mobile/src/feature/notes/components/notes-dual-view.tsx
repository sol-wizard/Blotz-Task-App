import { View, ScrollView, Pressable } from "react-native";
import { useState } from "react";
import { NoteCard } from "./note-card";
import { NoteDTO } from "../models/note-dto";

type ToggledMap = Record<number, boolean>;

export const NotesDualView = ({
  notes,
  onDeleteTask,
  isDeleting,
  onPressTask,
}: {
  notes: NoteDTO[];
  onDeleteTask: (t: NoteDTO) => void;
  isDeleting: boolean;
  onPressTask: (note: NoteDTO) => void;
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

  const leftColumn = notes.filter((_, index) => index % 2 === 0);
  const rightColumn = notes.filter((_, index) => index % 2 === 1);

  return (
    <Pressable onPress={dismissAll} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <View className="flex-row">
          <View className="flex-1 mr-1.5">
            {leftColumn.map((item) => {
              return (
                <NoteCard
                  key={item.id}
                  note={item}
                  isToggled={!!toggledMap[item.id]}
                  onToggle={() => handleToggle(item.id)}
                  onDelete={onDeleteTask}
                  isDeleting={isDeleting}
                  onPressCard={onPressTask}
                />
              );
            })}
          </View>

          <View className="flex-1 ml-1.5">
            {rightColumn.map((item) => {
              return (
                <NoteCard
                  key={item.id}
                  note={item}
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
