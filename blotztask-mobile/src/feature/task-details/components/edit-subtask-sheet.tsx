import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Modal from "react-native-modal";
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
      style={{ justifyContent: "center", margin: 10 }}
    >
      <View className="mx-8 bg-white px-5 pt-7 pb-7" style={{ borderRadius: 30 }}>
        <View className="flex-row items-center justify-between mb-6">
          <Text className="font-balooBold text-2xl" style={{ color: theme.colors.onSurface }}>
            {t("subtasks.edit")}
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            hitSlop={12}
            className="min-w-16 items-end justify-center"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.highlight} />
            ) : (
              <Text className="font-balooBold text-xl" style={{ color: theme.colors.highlight }}>
                {t("subtasks.done")}
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View className="mb-6">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("subtasks.titlePlaceholder")}
              submitBehavior="blurAndSubmit"
              multiline
              autoFocus
              className="rounded-2xl border border-[#6B7280] px-4 py-4 text-xl font-balooBold"
              style={{
                minHeight: 54,
                color: theme.colors.onSurface,
                textAlignVertical: "top",
                borderWidth: 1,
                borderColor: "#B7BBC7",
              }}
            />
          </View>

          <View>
            <Text className="font-balooBold text-lg mb-2" style={{ color: "#B7BBC7" }}>
              {t("subtasks.duration")}
            </Text>
            <View className="px-3">
              <View className="flex-row items-center justify-center">
                <WheelPicker
                  data={hourItems}
                  value={selectedHours}
                  width={72}
                  itemHeight={44}
                  visibleItemCount={3}
                  enableScrollByTapOnItem
                  overlayItemStyle={{
                    backgroundColor: "#F1F7E8",
                    borderBottomLeftRadius: 18,
                    borderTopLeftRadius: 18,
                  }}
                  onValueChanged={({ item }) => setSelectedHours(item.value as number)}
                  itemTextStyle={{
                    color: theme.colors.highlight,
                    fontSize: 34,
                    fontWeight: "700",
                  }}
                />

                <View className="h-11 items-center justify-center bg-[#F1F7E8] px-1">
                  <Text className="text-[#B7BBC7] text-base font-bold">h</Text>
                </View>

                <WheelPicker
                  data={minuteItems}
                  value={selectedMinutes}
                  width={72}
                  itemHeight={44}
                  visibleItemCount={3}
                  enableScrollByTapOnItem
                  overlayItemStyle={{ backgroundColor: "#F1F7E8" }}
                  onValueChanged={({ item }) => setSelectedMinutes(item.value as number)}
                  itemTextStyle={{
                    color: theme.colors.highlight,
                    fontSize: 34,
                    fontWeight: "700",
                  }}
                />

                <View className="h-11 items-center justify-center rounded-r-[18px] bg-[#F1F7E8] pl-1 pr-5">
                  <Text className="text-[#B7BBC7] text-base font-bold">min</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
