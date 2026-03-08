import React, { memo, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  SharedValue,
  interpolate,
  useAnimatedStyle,
  Extrapolation,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type ActionButtonProps = {
  icon: IconName;
  label: string;
  bgColorClass: string;
  onPress?: () => void;
  disabled?: boolean;
  progress?: SharedValue<number>;
  index: number;
};

const ActionButton = memo(function ActionButton({
  icon,
  label,
  bgColorClass,
  onPress,
  disabled,
  progress,
  index,
}: ActionButtonProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const p = progress?.value ?? 0;
    const delay = index * 0.08;

    return {
      opacity: interpolate(p, [0 + delay, 0.25 + delay, 1], [0, 0.6, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(p, [0, 1], [14, 0], Extrapolation.CLAMP),
        },
        {
          scale: interpolate(p, [0 + delay, 1], [0.92, 1], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled || !onPress}
        hitSlop={8}
        className="items-center"
      >
        <View
          className={`w-[38px] h-[38px] rounded-full items-center justify-center ${bgColorClass} ${
            disabled ? "opacity-60" : ""
          }`}
        >
          <MaterialCommunityIcons name={icon} size={18} color="#FFFFFF" />
        </View>

        <Text className="mt-1.5 text-xs text-gray-500 font-baloo">{label}</Text>
      </Pressable>
    </Animated.View>
  );
});

type NoteActionsProps<TNote> = {
  note?: TNote;
  onAddToTask?: (note?: TNote) => void;
  onDelete?: (note?: TNote) => void;
  progress?: SharedValue<number>;
  widthClassName?: string;
};


export const NoteActions = memo(function NoteActions<TNote>({
  note,
  onAddToTask,
  onDelete,
  progress,
}: NoteActionsProps<TNote>) {
  const handleAdd = useCallback(() => onAddToTask?.(note), [onAddToTask, note]);
  const handleDelete = useCallback(() => onDelete?.(note), [onDelete, note]);

  const { t } = useTranslation("notes");

  return (
    <View className={`w-[190px] h-full flex-row items-center justify-end pr-4`}>
      <View className="flex-row items-center" style={{ gap: 18 }}>
        <ActionButton
          index={0}
          progress={progress}
          icon="calendar-plus"
          label={t("noteActions.addToTask")}
          bgColorClass="bg-[#8BC34A]"
          onPress={handleAdd}
        />
        <ActionButton
          index={1}
          progress={progress}
          icon="trash-can-outline"
          label={t("noteActions.delete")}
          bgColorClass="bg-[#F0625F]"
          onPress={handleDelete}
        />
      </View>
    </View>
  );
});