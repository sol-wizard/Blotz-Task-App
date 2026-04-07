import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import TasksCheckbox from "../../../shared/components/ui/task-checkbox";
import { theme } from "@/shared/constants/theme";
import { convertDurationToText } from "../../../shared/util/convert-duration";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { ActionButton, ActionButtonType } from "@/feature/notes/components/action-button";
import { useState } from "react";
import { set } from "date-fns";
import { is } from "date-fns/locale";
import { TextInput } from "react-native-gesture-handler";

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

  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(subtask.title);

  const handleInlineEditToggle = () => {
    if (!isInlineEditing) {
      setTitleValue(subtask.title);
    }
    setIsInlineEditing((prev) => !prev);
  };

  const textColor = isChecked ? theme.colors.disabled : theme.colors.onSurface;

  const renderRightActions = () => {
    return (
      <View className="w-[70px] items-center justify-center">
        <ActionButton
          type={ActionButtonType.Delete}
          onPress={handleDelete}
          labelColor="#F56767"
          containerSize={30}
          iconSize={16}
        />
      </View>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      friction={2}
      enabled={!isEditMode}
      containerStyle={{ marginBottom: 8 }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => !isEditMode && handleToggle()}
        onLongPress={isEditMode ? drag : undefined}
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          backgroundColor: "#FFFFFF",
        }}
      >
        <View className="flex-row items-center px-4 py-1">
          <View style={{ width: 32, justifyContent: "center" }}>
            <TasksCheckbox checked={isChecked} onChange={handleToggle} size={24} />
          </View>

          <View style={{ flex: 1, marginLeft: 4 }}>
          {isInlineEditing ? (
            <>
              <View className="flex-row items-center gap-4">
                {subtask.duration && (
                  <Text
                    className="text-[12px] font-bold"
                    style={{
                      color: isChecked ? "#BDE6A3" : theme.colors.highlight,
                      marginBottom: -2,
                      fontWeight: "700",
                    }}
                  >
                    {convertDurationToText(subtask.duration)}
                  </Text>
                )}
                <TextInput
                  value={titleValue}
                  onChangeText={setTitleValue}
                  placeholder="Subtask Title"
                  multiline
                  className="text-3 font-bold"
                  style={{
                    color: theme.colors.onSurface,
                    paddingVertical: 8,
                    paddingRight: 4,
                    textAlignVertical: "top",
                    flexShrink: 1,
                  }}
                />
              </View>
            </>
            ) : (
              <>
                {subtask.duration && (
                  <Text
                    className="text-[12px] font-bold"
                    style={{
                      color: isChecked ? "#BDE6A3" : theme.colors.highlight,
                      marginBottom: -2,
                      fontWeight: "700",
                    }}
                  >
                    {convertDurationToText(subtask.duration)}
                  </Text>
                )}
                <Text
                  numberOfLines={2}
                  className={`text-base font-bold ${isChecked ? "line-through" : ""}`}
                  style={{ color: textColor }}
                >
                  {subtask?.title}
                </Text>
            </>
            )}
          </View>

          <View style={{ width: 32, alignItems: "center", justifyContent: "center" }}>
            {isEditMode ? (
              <TouchableOpacity onPressIn={drag} activeOpacity={1}>
                <MaterialIcons name="unfold-more" size={26} color={theme.colors.disabled} />
              </TouchableOpacity>
            ) : isInlineEditing ? (
                <TouchableOpacity onPress={handleInlineEditToggle}>
                <Text className="text-sm font-bold" style={{ color: theme.colors.highlight }}>
                  Done
                </Text>
              </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handleInlineEditToggle}>
                  <MaterialCommunityIcons
                    name="pencil-minus-outline"
                    size={22}
                    color={theme.colors.disabled}
                  />
                </TouchableOpacity>
              )
            }
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}
