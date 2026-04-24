import React from "react";
import { View, Pressable, Text } from "react-native";
import { Control, Controller } from "react-hook-form";
import { LabelDTO } from "@/shared/models/label-dto";
import { useTranslation } from "react-i18next";
import { TaskFormField } from "../models/task-form-schema";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/shared/constants/theme";

interface LabelSelectProps {
  control: Control<TaskFormField>;
  labels: LabelDTO[];
}

export function LabelSelectWithData({ control }: { control: Control<TaskFormField> }) {
  const { t } = useTranslation("tasks");
  const { labels, isLoading } = useAllLabels();

  if (isLoading) {
    return (
      <Text className="font-baloo text-lg text-primary mt-3">{t("common:loading.categories")}</Text>
    );
  }

  return <LabelSelect control={control} labels={labels} />;
}

function LabelSelect({ control, labels }: LabelSelectProps) {
  const { t } = useTranslation("tasks");

  const getTranslatedLabelName = (labelName: string): string => {
    const lowerName = labelName.toLowerCase();
    const translationKey = `categories.${lowerName}`;
    const translated = t(translationKey);
    // If translation key doesn't exist, return original name
    return translated !== translationKey ? translated : labelName;
  };

  const Chip = ({
    item,
    selected,
    onPress,
    disabled,
  }: {
    item: LabelDTO;
    selected: boolean;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      style={{ backgroundColor: item.color }}
      className={`min-h-[44px] px-[14px] py-[10px] rounded-xl mr-2 mb-2 border-2 ${selected ? "border-black" : "border-transparent"}`}
    >
      <Text className="font-baloo">{getTranslatedLabelName(item.name)}</Text>
    </Pressable>
  );

  return (
    <Controller
      control={control}
      name="labelId"
      render={({ field: { onChange, value } }) => {
        return (
          <View className="flex-row flex-wrap mt-3">
            {labels.map((l) => (
              <Chip
                key={l.labelId}
                item={l}
                selected={value === l.labelId}
                onPress={() => {
                  const nextValue = value === l.labelId ? null : l.labelId;
                  onChange(nextValue);
                }}
              />
            ))}
          </View>
        );
      }}
    />
  );
}

export function FailedToLoadLabel({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <View className="mt-3 flex-row items-center justify-between bg-background px-4 py-3 rounded-xl">
      <View className="flex-row items-center gap-2">
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={18}
          color={theme.colors.warning}
        />
        <Text className="font-baloo text-base" style={{ color: theme.colors.warning }}>
          Failed to load categories
        </Text>
      </View>
      <Pressable onPress={resetErrorBoundary} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text className="font-baloo text-sm text-primary underline">Retry</Text>
      </Pressable>
    </View>
  );
}
