import { View, Text } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import TasksCheckbox from "./task-checkbox";
import { theme } from "@/shared/constants/theme";
import { convertDurationToText } from "../../../shared/util/convert-duration";
import { Swipeable, TouchableOpacity } from "react-native-gesture-handler";

type SubtaskItemData = {
  id: number;
  title: string;
  duration?: string;
  isDone: boolean;
};

type SubtaskItemProps = {
  item: SubtaskItemData;
  onToggle: (id: number) => void;
  color?: string;
  isEditMode?: boolean;
  onDelete?: (id: number) => void;
  drag?: () => void;
};

export default function SubtaskItem({
  item: subtask,
  onToggle,
  color,
  isEditMode = false,
  onDelete,
  drag,
}: SubtaskItemProps) {
  const isChecked = subtask?.isDone;
  const handleToggle = () => {
    onToggle(subtask.id);
  };

  const handleDelete = () => {
    onDelete?.(subtask.id);
  };

  const textColor = isChecked ? theme.colors.disabled : theme.colors.onSurface;

  const renderRightActions = () => {
    return (
      <View style={{ justifyContent: "center", alignItems: "center", width: 70 }}>
        <TouchableOpacity onPress={handleDelete} className="items-center">
          <View
            style={{
              backgroundColor: theme.colors.warning,
              width: 32,
              height: 32,
              borderRadius: 16,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 2,
            }}
          >
            <MaterialIcons name="delete" size={18} color="white" />
          </View>
          <Text className="text-[9px] font-balooBold text-center" style={{ color: theme.colors.warning }}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      friction={2}
      enabled={!isEditMode}
      containerStyle={{ marginBottom: 12 }}
      activeOffsetX={[-10, 10]}
      failOffsetY={[-5, 5]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => !isEditMode && handleToggle()}
        onLongPress={isEditMode ? drag : undefined}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.secondary,
          flexDirection: "row",
          alignItems: "center",
          minHeight: 50,
          paddingHorizontal: 12,
          paddingVertical: 6,
        }}
      >
        {isChecked && (
          <View
            className="absolute top-0 left-0 right-0 bottom-0 z-10"
            style={{ backgroundColor: "rgba(200, 200, 200, 0.1)", borderRadius: 12 }}
            pointerEvents="none"
          />
        )}

        <View style={{ width: 34, justifyContent: "center" }}>
          <TasksCheckbox checked={isChecked} onChange={handleToggle} size={24} />
        </View>

        <View style={{ flex: 1, marginLeft: 8, justifyContent: "center" }}>
          {subtask.duration && (
            <Text
              className="text-[12px] font-balooBold"
              style={{ color: isChecked ? theme.colors.disabled : theme.colors.highlight, marginBottom: -1 }}
            >
              {convertDurationToText(subtask.duration)}
            </Text>
          )}
          <Text
            numberOfLines={2}
            className={`text-base font-baloo ${isChecked ? "line-through" : ""}`}
            style={{ color: textColor }}
          >
            {subtask?.title}
          </Text>
        </View>

        <View style={{ width: 32, alignItems: "center", justifyContent: "center" }}>
          {isEditMode ? (
            <TouchableOpacity onPressIn={drag} activeOpacity={1}>
              <MaterialIcons name="unfold-more" size={26} color={theme.colors.disabled} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => console.log("Edit subtask clicked")}>
              <MaterialCommunityIcons name="pencil-minus-outline" size={22} color={theme.colors.disabled} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}
