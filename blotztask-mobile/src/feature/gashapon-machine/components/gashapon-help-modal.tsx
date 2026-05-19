import React from "react";
import { Modal, View, Text, ScrollView, Pressable } from "react-native";
import { useTranslation } from "react-i18next";

interface GashaponHelpModalProps {
  visible: boolean;
  onClose: () => void;
}

export const GashaponHelpModal: React.FC<GashaponHelpModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation("notes");
  const helpSteps = t("gashapon.helpSteps", { returnObjects: true }) as string[];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <Pressable className="flex-1 bg-black/40 items-center justify-center px-6" onPress={onClose}>
        <Pressable
          className="w-full max-w-[320px] rounded-3xl bg-background px-6 py-7"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <Text className="text-slate-800 text-2xl font-bold text-center font-baloo">
            {t("gashapon.helpTitle")}
          </Text>
          <ScrollView className="mt-4 max-h-72" showsVerticalScrollIndicator={false}>
            {helpSteps.map((step, index) => (
              <View key={step} className="mb-3 flex-row">
                <Text className="w-7 text-base leading-6 text-secondary font-balooBold">
                  {index + 1}.
                </Text>
                <Text className="flex-1 text-base leading-6 text-gray-600 font-balooThin">
                  {step}
                </Text>
              </View>
            ))}
          </ScrollView>
          <Pressable
            onPress={onClose}
            className="mt-6 h-11 items-center justify-center rounded-full bg-[#99D612]"
          >
            <Text className="text-slate-900 font-semibold font-baloo">{t("close")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
