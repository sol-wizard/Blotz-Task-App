import { Pressable, View, Text, ActivityIndicator } from "react-native";
import Modal from "react-native-modal";
import { useTranslation } from "react-i18next";
import { NoteTimeEstimationResult } from "../models/note-time-estimation-result";
import { formatDuration } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";

interface Props {
  visible: boolean;
  setIsModalVisible: (v: boolean) => void;
  estimateResult?: NoteTimeEstimationResult;
  estimationError: string | null;
  isEstimating?: boolean;
}

export const NoteTimeEstimateModal = ({
  visible,
  setIsModalVisible,
  isEstimating,
  estimateResult,
  estimationError,
}: Props) => {
  const { t, i18n } = useTranslation("notes");

  const formatEstimateDuration = (rawDuration: string) => {
    const [h, m, s] = rawDuration.split(":").map(Number);
    if ([h, m, s].some((n) => Number.isNaN(n))) return rawDuration;

    const totalMinutes = Math.round((h * 3600 + m * 60 + s) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const isZh = i18n.language.toLowerCase().startsWith("zh");

    const text = formatDuration(
      { hours, minutes },
      { format: ["hours", "minutes"], locale: isZh ? zhCN : enUS },
    );

    return text || (isZh ? "0分钟" : "0 minutes");
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={() => setIsModalVisible(false)}
      backdropOpacity={0.4}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver={false}
    >
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-[280px] rounded-3xl bg-background p-10">
          {isEstimating && (
            <View className="items-center py-4">
              <ActivityIndicator size="large" />
              <Text className="mt-4 text-lg text-gray-600 font-balooBold">
                {t("timeEstimate.estimating")}
              </Text>
            </View>
          )}

          {!isEstimating && estimateResult?.isSuccess && (
            <>
              <Text className="text-xl leading-6 text-onSurface font-baloo pt-2">
                {t("timeEstimate.estimatedMessage")}
                <Text className="text-highlight">
                  {formatEstimateDuration(estimateResult.duration)}
                </Text>
                .
              </Text>

              <View className="mt-8 flex-row items-center justify-center">
                <Pressable
                  onPress={() => setIsModalVisible(false)}
                  className="h-9 px-6 rounded-xl bg-highlight items-center justify-center"
                >
                  <Text className="text-sm text-onSurface font-baloo">
                    {t("timeEstimate.startNow")}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {!isEstimating && estimationError && (
            <>
              <Text className="text-gray-600 font-baloo mb-6 text-lg">{estimationError}</Text>

              <Pressable onPress={() => setIsModalVisible(false)} className="items-center">
                <Text className="text-lg text-gray-400 font-balooThin">
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
