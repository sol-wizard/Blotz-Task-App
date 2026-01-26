import { getLabelIcon } from "@/feature/notes/utils/get-label-icon";
import React from "react";
import { Modal, View, Text, Pressable, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { NoteDTO } from "@/feature/notes/models/note-dto";

type TaskRevealModalProps = {
  visible: boolean;
  task: NoteDTO | null;
  onDoNow: () => void;
  onCancel?: () => void;
};

export const TaskRevealModal = ({ visible, task, onCancel, onDoNow }: TaskRevealModalProps) => {
  const { t } = useTranslation("starSpark");
  const imageSource = getLabelIcon();
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
            <Image source={imageSource} className="w-16 h-16 mb-3" resizeMode="contain" />

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
              className="flex-1 ml-2 rounded-full h-11 items-center justify-center bg-[#99D612]"
            >
              <Text className="text-slate-900 font-semibold font-baloo">
                {t("gashapon.doItNow")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
