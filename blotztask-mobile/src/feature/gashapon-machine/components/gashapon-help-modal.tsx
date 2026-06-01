import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import Modal from "react-native-modal";

interface GashaponHelpModalProps {
  visible: boolean;
  onClose: () => void;
}

export const GashaponHelpModal: React.FC<GashaponHelpModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation("notes");
  const helpSteps = t("gashapon.helpSteps", { returnObjects: true }) as string[];

  return (
    <Modal
      isVisible={visible}
      animationIn="slideInUp"
      statusBarTranslucent
      onBackdropPress={() => onClose()}
    >
      <View className="items-center justify-center p-6 w-200 h-300 bg-background rounded-2xl">
        <ScrollView className="w-full">
          <Text className="text-slate-800 text-2xl font-bold text-center font-baloo">
            {t("gashapon.helpTitle")}
          </Text>
          <View className="mt-4">
            {helpSteps.map((step, index) => (
              <View key={step} className="mb-3 flex-row w-full">
                <Text className="w-7 text-xl leading-6 text-secondary font-balooBold">
                  {index + 1}.
                </Text>
                <Text className="flex-1 text-xl leading-6 text-gray-600 font-balooThin">
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <Pressable
          onPress={onClose}
          className="mt-6 h-11 w-36 items-center justify-center rounded-full bg-highlight"
        >
          <Text className="text-slate-900 font-semibold font-baloo">{t("close")}</Text>
        </Pressable>
      </View>
    </Modal>
  );
};
