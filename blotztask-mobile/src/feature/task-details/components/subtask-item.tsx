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
      <View className="w-[70px] items-center justify-center">
        <TouchableOpacity onPress={handleDelete} className="items-center">
          <View
            className="w-8 h-8 rounded-full items-center justify-center mb-0.5"
            style={{ backgroundColor: theme.colors.warning }}
          >
            <MaterialIcons name="delete" size={18} color="white" />
          </View>
          <Text
            className="text-[9px] font-bold text-center"
            style={{ color: theme.colors.warning }}
          >
            Delete
          </Text>
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
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.secondary,
          backgroundColor: isChecked ? "rgba(200, 200, 200, 0.15)" : "#FFFFFF",
        }}
      >
        <View className="flex-row items-center min-h-[50px] px-3 py-1.5">
          <View style={{ width: 34, justifyContent: "center" }}>
            <TasksCheckbox checked={isChecked} onChange={handleToggle} size={24} />
          </View>

          <View style={{ flex: 1, marginLeft: 8, justifyContent: "center" }}>
            {subtask.duration && (
              <Text
                className="text-[12px] font-bold"
                style={{
                  color: isChecked ? theme.colors.disabled : theme.colors.highlight,
                  marginBottom: -1,
                }}
              >
                {convertDurationToText(subtask.duration)}
              </Text>
            )}
            <Text
              numberOfLines={2}
              className={`text-base ${isChecked ? "line-through" : ""}`}
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
                <MaterialCommunityIcons
                  name="pencil-minus-outline"
                  size={22}
                  color={theme.colors.disabled}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}
