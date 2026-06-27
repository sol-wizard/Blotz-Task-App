import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Modal from "react-native-modal";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import WheelPicker, { type PickerItem } from "@quidone/react-native-wheel-picker";
import { theme } from "@/shared/constants/theme";
import { SubtaskDTO } from "../models/subtask-dto";
import { useTranslation } from "react-i18next";

type EditSubtaskSheetProps = {
  visible: boolean;
  subtask: SubtaskDTO;
  isSaving: boolean;
  onClose: () => void;
  onSave: (title: string, duration: string) => void;
};

const createPickerItems = (length: number): PickerItem<number>[] =>
  Array.from({ length }, (_, value) => ({
    value,
    label: value.toString().padStart(2, "0"),
  }));

const hourItems = createPickerItems(24);
const minuteItems = createPickerItems(60);

const parseDuration = (duration?: string) => {
  const [hours = "0", minutes = "0"] = (duration ?? "00:00:00").split(":");

  return {
    hours: Number(hours) || 0,
    minutes: Number(minutes) || 0,
  };
};

export default function EditSubtaskSheet({
  visible,
  subtask,
  isSaving,
  onClose,
  onSave,
}: EditSubtaskSheetProps) {
  const { t } = useTranslation(["tasks"]);
  const initialDuration = parseDuration(subtask.duration);
  const [title, setTitle] = useState(subtask.title);
  const [selectedHours, setSelectedHours] = useState(initialDuration.hours);
  const [selectedMinutes, setSelectedMinutes] = useState(initialDuration.minutes);

  const handleSave = () => {
    const hours = selectedHours.toString().padStart(2, "0");
    const minutes = selectedMinutes.toString().padStart(2, "0");
    onSave(title.trim() || subtask.title, `${hours}:${minutes}:00`);
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.4}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      avoidKeyboard
      useNativeDriver
      style={{ margin: 0 }}
    >
      <View className="mt-auto bg-white rounded-t-3xl px-6 pt-4 pb-2">
        <View className="h-1.5 w-12 self-center rounded-full bg-[#D1D5DB] mb-5" />

        <View className="flex-row items-center justify-between mb-5">
          <Text className="font-balooBold text-2xl" style={{ color: theme.colors.onSurface }}>
            {t("subtasks.edit")}
          </Text>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View className="mb-5">
            <Text className="font-balooBold text-sm mb-2" style={{ color: theme.colors.disabled }}>
              {t("subtasks.title")}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("subtasks.titlePlaceholder")}
              submitBehavior="blurAndSubmit"
              multiline
              autoFocus
              className="rounded-2xl border border-gray-950 px-4 py-3 text-base font-balooBold"
              style={{
                minHeight: 96,
                color: theme.colors.onSurface,
                textAlignVertical: "top",
              }}
            />
          </View>

          <View className="mb-4">
            <Text className="font-balooBold text-sm mb-1" style={{ color: theme.colors.disabled }}>
              {t("subtasks.duration")}
            </Text>
            <View className="rounded-2xl px-3 py-1.5">
              <View className="flex-row items-center justify-center">
                <WheelPicker
                  data={hourItems}
                  value={selectedHours}
                  width={52}
                  itemHeight={30}
                  visibleItemCount={3}
                  enableScrollByTapOnItem
                  onValueChanged={({ item }) => setSelectedHours(item.value as number)}
                  itemTextStyle={{
                    color: theme.colors.highlight,
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                />

                <Text className="text-[#B7BBC7] text-sm font-bold mx-1.5">h</Text>

                <WheelPicker
                  data={minuteItems}
                  value={selectedMinutes}
                  width={58}
                  itemHeight={30}
                  visibleItemCount={3}
                  enableScrollByTapOnItem
                  onValueChanged={({ item }) => setSelectedMinutes(item.value as number)}
                  itemTextStyle={{
                    color: theme.colors.highlight,
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                />

                <Text className="text-[#B7BBC7] text-sm font-bold ml-1.5">min</Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            className={`rounded-xl py-3.5 px-4 items-center justify-center ${
              isSaving ? "bg-[#F3F4F6]" : "bg-lime-300"
            }`}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.onSurface} />
            ) : (
              <Text className="font-balooBold text-lg text-black">{t("subtasks.done")}</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
