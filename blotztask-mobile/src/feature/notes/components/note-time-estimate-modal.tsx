import { Pressable, View, Text, ActivityIndicator } from "react-native";
import Modal from "react-native-modal";
import { useTranslation } from "react-i18next";

interface Props {
  visible: boolean;
  setIsModalVisible: (v: boolean) => void;
  pickTime: () => void;
  handleStartNow: () => void;
  durationText?: string;
  error?: string | null;
  isEstimating?: boolean;
}

export const NoteTimeEstimateModal = ({
  visible,
  setIsModalVisible,
  pickTime,
  durationText,
  handleStartNow,
  error,
  isEstimating,
}: Props) => {
  const { t } = useTranslation("notes");
  const handlePickTime = () => {
    setIsModalVisible(false);
    pickTime();
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={() => setIsModalVisible(false)}
      backdropOpacity={0.4}
      animationIn="fadeIn"
      animationOut="fadeOut"
      useNativeDriver
      style={{ margin: 0 }}
    >
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-[280px] rounded-3xl bg-background px-10 py-14">
          {isEstimating && (
            <View className="items-center py-4">
              <ActivityIndicator size="large" />
              <Text className="mt-4 text-lg text-gray-600 font-balooBold">
                {t("timeEstimate.estimating")}
              </Text>
            </View>
          )}

          {!isEstimating && !error && durationText && (
            <>
              <Text className="text-xl leading-6 text-onSurface font-baloo pt-2">
                {t("timeEstimate.estimatedMessage")}
                <Text className="text-highlight">{durationText}</Text>.
              </Text>

              <View className="mt-8 flex-row items-center justify-center">
                <Pressable
                  onPress={handleStartNow}
                  className="h-9 px-6 rounded-xl bg-highlight items-center justify-center"
                >
                  <Text className="text-sm text-onSurface font-baloo">
                    {t("timeEstimate.startNow")}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {!isEstimating && error && (
            <>
              <Text className="text-lg text-gray-800 font-balooExtraBold mb-2">
                {t("timeEstimate.oops")}
              </Text>

              <Text className="text-gray-600 font-baloo mb-6">
                {t("timeEstimate.errorMessage")}
              </Text>

              <Pressable onPress={() => setIsModalVisible(false)} className="items-center">
                <Text className="text-sm text-gray-400 font-balooThin">
                  {t("timeEstimate.dismiss")}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};
