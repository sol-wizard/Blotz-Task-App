import { getStarIconAsBefore } from "@/shared/util/get-star-icon";
import React from "react";
import { ActivityIndicator, Modal, View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { NoteDTO } from "@/feature/notes/models/note-dto";
import { theme } from "@/shared/constants/theme";

type NoteRevealModalProps = {
  visible: boolean;
  task: NoteDTO | null;
  onDoNow: () => void;
  onCancel?: () => void;
  isDoNowLoading?: boolean;
};

export const NoteRevealModal = ({
  visible,
  task,
  onCancel,
  onDoNow,
  isDoNowLoading = false,
}: NoteRevealModalProps) => {
  const { t } = useTranslation("notes");
  const imageSource = task ? getStarIconAsBefore(task.id) : undefined;
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 bg-black/40 items-center justify-center">
        <View
          className="w-80 rounded-3xl bg-background px-6 py-7"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <View className="items-center mb-4">
            <Image source={imageSource} className="w-16 h-16 mb-3" contentFit="cover" />

            <Text className="text-gray-500 text-sm font-balooThin">
              {t("gashapon.revealTitle")}
            </Text>
            <Text className="text-slate-800 text-2xl font-bold mt-1 text-center font-baloo">
              {task?.text}
            </Text>
          </View>

          <View className="flex-row justify-between mt-2">
            <Pressable
              onPress={onCancel}
              className="flex-1 mr-2 bg-white rounded-full h-11 items-center justify-center"
            >
              <Text className="text-gray-400 font-semibold font-baloo">{t("gashapon.cancel")}</Text>
            </Pressable>

            <Pressable
              onPress={onDoNow}
              disabled={isDoNowLoading}
              className={`flex-1 ml-2 rounded-full h-11 items-center justify-center ${
                isDoNowLoading ? "bg-[#F3F4F6]" : "bg-[#99D612]"
              }`}
            >
              {isDoNowLoading ? (
                <ActivityIndicator size="small" color={theme.colors.onSurface} />
              ) : (
                <Text className="text-slate-900 font-semibold font-baloo">
                  {t("gashapon.doItNow")}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
